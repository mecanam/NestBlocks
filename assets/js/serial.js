// ──────────────────────────────
// NestSerial — Web Serial API モジュール
// Raspberry Pi Pico (MicroPython) との通信
//
// MicroPython Raw REPL プロトコル準拠:
//   - コードは 256 バイトごとに分割送信（バッファオーバーフロー防止）
//   - 各ステップで Pico からの応答を確認してから次へ進む
//   - 中断は \r\x03 (CR + Ctrl+C) を使用
// ──────────────────────────────
var NestSerial = (function () {

  // ── 内部状態 ──
  var port = null;
  var reader = null;
  var writer = null;
  var readLoopActive = false;
  var connected = false;
  var running = false;

  var decoder = new TextDecoder();
  var encoder = new TextEncoder();

  var onDataCallback = null;
  var onDisconnectCallback = null;

  // ── プロトコルバッファ ──
  // 受信データを蓄積し、特定パターンの到着を待機するための仕組み
  var protocolBuffer = '';
  var protocolListeners = []; // [{pattern, resolve, timer}]

  // ── ユーザー出力用バッファ ──
  var lineBuffer = '';

  // ── 低レベル送信 ──
  function writeBytes(bytes) {
    if (!writer) return Promise.reject(new Error('writer が無効です'));
    return writer.write(new Uint8Array(bytes));
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // ── プロトコル応答待ち ──
  // 受信データから指定パターンを検出するまで待つ（タイムアウト付き）
  function waitFor(pattern, timeoutMs) {
    // 既にバッファ内にあるかチェック
    var idx = protocolBuffer.indexOf(pattern);
    if (idx !== -1) {
      var consumed = protocolBuffer.substring(0, idx + pattern.length);
      protocolBuffer = protocolBuffer.substring(idx + pattern.length);
      return Promise.resolve(consumed);
    }

    return new Promise(function (resolve) {
      var listener = { pattern: pattern, resolve: resolve, timer: null };
      listener.timer = setTimeout(function () {
        // タイムアウト: リスナーを除去して null で解決
        var i = protocolListeners.indexOf(listener);
        if (i !== -1) protocolListeners.splice(i, 1);
        console.warn('[NestSerial] 応答タイムアウト (' + timeoutMs + 'ms, パターン: "' +
          pattern.replace(/[\x00-\x1f]/g, function (c) { return '\\x' + ('0' + c.charCodeAt(0).toString(16)).slice(-2); })
          + '")');
        resolve(null);
      }, timeoutMs);
      protocolListeners.push(listener);
    });
  }

  // プロトコルバッファを消去（新しい操作の前に呼ぶ）
  function flushProtocolBuffer() {
    protocolBuffer = '';
    for (var i = 0; i < protocolListeners.length; i++) {
      clearTimeout(protocolListeners[i].timer);
    }
    protocolListeners = [];
  }

  // ── コード分割送信（256バイトチャンク）──
  // Pico のシリアルバッファは 256 バイト。これを超えるとデータが欠落する。
  function writeChunked(code) {
    var bytes = encoder.encode(code);
    var CHUNK_SIZE = 256;
    var chunks = [];
    for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
      chunks.push(bytes.slice(i, i + CHUNK_SIZE));
    }
    console.log('[NestSerial] ' + bytes.length + ' bytes を ' + chunks.length + ' チャンクに分割送信');

    var p = Promise.resolve();
    for (var c = 0; c < chunks.length; c++) {
      (function (chunk) {
        p = p.then(function () {
          return writer.write(chunk);
        }).then(function () {
          return delay(10); // チャンク間 10ms 待機（MicroPython公式仕様）
        });
      })(chunks[c]);
    }
    return p;
  }

  // ── 受信データ処理 ──
  function handleIncomingData(text) {
    // 1. プロトコルリスナーにデータを供給
    protocolBuffer += text;
    for (var i = protocolListeners.length - 1; i >= 0; i--) {
      var listener = protocolListeners[i];
      var idx = protocolBuffer.indexOf(listener.pattern);
      if (idx !== -1) {
        var consumed = protocolBuffer.substring(0, idx + listener.pattern.length);
        protocolBuffer = protocolBuffer.substring(idx + listener.pattern.length);
        clearTimeout(listener.timer);
        protocolListeners.splice(i, 1);
        listener.resolve(consumed);
      }
    }

    // 2. 実行中のみユーザーに出力を転送
    if (!running || !onDataCallback) return;

    // \x04 マーカーを除去（stdout/stderr の区切り）
    var clean = text.replace(/\x04/g, '');
    lineBuffer += clean;

    var lines = lineBuffer.split('\n');
    lineBuffer = lines.pop();

    for (var j = 0; j < lines.length; j++) {
      var line = lines[j].replace(/\r$/, '');
      // REPL プロトコルのノイズを除去
      if (line === 'OK' || line === 'raw REPL; CTRL-B to exit') continue;
      if (/^>+$/.test(line)) continue;
      if (/^MicroPython v/.test(line)) continue;
      if (/^Type "help\(\)"/.test(line)) continue;
      if (line === 'soft reboot') continue;
      // '>OK' プレフィックスを除去（実際の出力は残す）
      line = line.replace(/^>+OK/, '');
      line = line.replace(/^>+/, '');
      if (line === '') continue;
      onDataCallback(line);
    }
  }

  // ── 切断処理 ──
  function handleDisconnect() {
    console.log('[NestSerial] 切断検知');
    connected = false;
    running = false;
    port = null;
    reader = null;
    writer = null;
    readLoopActive = false;
    lineBuffer = '';
    flushProtocolBuffer();
    if (onDisconnectCallback) {
      onDisconnectCallback();
    }
  }

  // ── 受信ループ ──
  function startReadLoop() {
    if (!port || !port.readable) return;

    reader = port.readable.getReader();
    readLoopActive = true;

    function pump() {
      if (!readLoopActive) {
        if (reader) { reader.releaseLock(); reader = null; }
        return;
      }
      reader.read().then(function (result) {
        if (result.done) {
          if (reader) { reader.releaseLock(); reader = null; }
          readLoopActive = false;
          return;
        }
        var text = decoder.decode(result.value, { stream: true });
        handleIncomingData(text);
        pump();
      }).catch(function () {
        readLoopActive = false;
        if (reader) {
          try { reader.releaseLock(); } catch (e) { /* ignore */ }
          reader = null;
        }
        handleDisconnect();
      });
    }
    pump();
  }

  // ── 中断シーケンス ──
  // MicroPython 公式: \r\x03 (CR + Ctrl+C) で KeyboardInterrupt を発生させる
  function interruptPico() {
    return writeBytes([0x0D, 0x03])       // CR + Ctrl+C (1回目)
      .then(function () { return delay(100); })
      .then(function () { return writeBytes([0x0D, 0x03]); }) // 2回目
      .then(function () { return delay(100); });
  }

  // ── Raw REPL に入る ──
  // 1. 実行中プログラムを中断
  // 2. Friendly REPL に戻す (Ctrl+B)
  // 3. Raw REPL に入る (Ctrl+A)
  // 4. ソフトリセット (Ctrl+D) で状態をクリーン化
  // 5. '>' プロンプトを確認
  function enterRawRepl() {
    flushProtocolBuffer();
    console.log('[NestSerial] Raw REPL 移行開始');

    return interruptPico()
      .then(function () { return writeBytes([0x02]); })       // Ctrl+B: friendly REPL
      .then(function () { return delay(100); })
      .then(function () {
        // Raw REPL に入る → 'raw REPL; CTRL-B to exit\r\n>' を待つ
        var ready = waitFor('>', 5000);
        return writeBytes([0x0D, 0x01])                       // CR + Ctrl+A: raw REPL
          .then(function () { return ready; });
      })
      .then(function (response) {
        if (response === null) {
          console.warn('[NestSerial] Raw REPL プロンプト未検出、ソフトリセットを試行');
          // ソフトリセットで再試行
          var ready2 = waitFor('>', 5000);
          return writeBytes([0x04])                           // Ctrl+D: soft reset
            .then(function () { return ready2; });
        }
        console.log('[NestSerial] Raw REPL に入りました');
        // ソフトリセットで状態をクリーンにする
        var afterReset = waitFor('>', 5000);
        return writeBytes([0x04])                             // Ctrl+D: soft reset
          .then(function () { return afterReset; });
      })
      .then(function (response) {
        if (response === null) {
          console.error('[NestSerial] ソフトリセット後のプロンプト未検出');
        } else {
          console.log('[NestSerial] ソフトリセット完了、Pico 準備OK');
        }
      });
  }

  // ── 接続 ──
  function connect(baudRate) {
    if (connected) return Promise.resolve();

    if (!('serial' in navigator)) {
      return Promise.reject(new Error(
        'このブラウザは Web Serial API に対応していません。Chrome または Edge をお使いください。'
      ));
    }

    console.log('[NestSerial] 接続開始 (baudRate:', baudRate, ')');

    return navigator.serial.requestPort({
      filters: [{ usbVendorId: 0x2E8A }] // Raspberry Pi vendor ID
    })
    .then(function (selectedPort) {
      port = selectedPort;
      return port.open({ baudRate: baudRate });
    })
    .then(function () {
      writer = port.writable.getWriter();
      connected = true;
      startReadLoop();
      console.log('[NestSerial] ポートを開きました');
      // Friendly REPL に戻す（raw REPL には入らない）
      return interruptPico()
        .then(function () { return writeBytes([0x02]); }) // Ctrl+B
        .then(function () { return delay(200); })
        .then(function () { console.log('[NestSerial] 接続完了'); });
    });
  }

  // ── 切断 ──
  function disconnect() {
    readLoopActive = false;
    running = false;

    var p = Promise.resolve();

    if (reader) {
      p = p.then(function () { return reader.cancel(); })
           .then(function () {
             try { reader.releaseLock(); } catch (e) { /* ignore */ }
             reader = null;
           });
    }

    if (writer) {
      try { writer.releaseLock(); } catch (e) { /* ignore */ }
      writer = null;
    }

    if (port) {
      p = p.then(function () { return port.close(); })
           .then(function () {
             port = null;
             connected = false;
           });
    }

    return p;
  }

  // ── コード実行（Raw REPL プロトコル）──
  function executeCode(code) {
    if (!connected || !writer) {
      return Promise.reject(new Error('Pico が接続されていません'));
    }

    running = true;
    lineBuffer = '';
    console.log('[NestSerial] コード実行開始 (' + code.length + ' bytes)');

    // Raw REPL プロトコル (MicroPython 公式仕様):
    // 1. Raw REPL に入る（中断→ソフトリセット含む）
    // 2. コードを 256 バイトずつ分割送信
    // 3. Ctrl+D で実行開始
    // 4. 'OK' 応答を確認
    return enterRawRepl()
      .then(function () {
        console.log('[NestSerial] コード送信中...');
        return writeChunked(code);
      })
      .then(function () {
        // 実行開始: Ctrl+D を送信し 'OK' を待つ
        var okReady = waitFor('OK', 5000);
        return writeBytes([0x04])                             // Ctrl+D: 実行
          .then(function () { return okReady; });
      })
      .then(function (response) {
        if (response === null) {
          console.warn('[NestSerial] OK 応答なし（コード送信に問題がある可能性）');
        } else {
          console.log('[NestSerial] OK 受信、コード実行中');
        }
      })
      .catch(function (err) {
        running = false;
        console.error('[NestSerial] 実行エラー:', err);
        throw err;
      });
  }

  // ── 実行停止 ──
  function stopExecution() {
    if (!connected || !writer) {
      return Promise.reject(new Error('Pico が接続されていません'));
    }
    running = false;
    lineBuffer = '';
    console.log('[NestSerial] 停止処理開始');

    return interruptPico()
      .then(function () { return writeBytes([0x0D, 0x03]); }) // 3回目の中断
      .then(function () { return delay(100); })
      .then(function () { return writeBytes([0x02]); })       // Ctrl+B: friendly REPL に戻す
      .then(function () { return delay(100); })
      .then(function () { console.log('[NestSerial] 停止完了'); });
  }

  // ── コード書き込み（main.py として Pico に保存）──
  function uploadCode(code) {
    if (!connected || !writer) {
      return Promise.reject(new Error('Pico が接続されていません'));
    }

    // コード内の特殊文字をエスケープして Python 文字列に埋め込む
    var escaped = code
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');

    var writerScript =
      "f = open('main.py', 'w')\n" +
      "f.write('" + escaped + "')\n" +
      "f.close()\n" +
      "print('main.py written')\n";

    return executeCode(writerScript);
  }

  // ── USB 物理切断の検知 ──
  if ('serial' in navigator) {
    navigator.serial.addEventListener('disconnect', function (event) {
      if (port && event.target === port) {
        handleDisconnect();
      }
    });
  }

  // ── 公開 API ──
  return {
    connect: connect,
    disconnect: disconnect,
    executeCode: executeCode,
    stopExecution: stopExecution,
    uploadCode: uploadCode,
    isConnected: function () { return connected; },
    isRunning: function () { return running; },
    setOnData: function (cb) { onDataCallback = cb; },
    setOnDisconnect: function (cb) { onDisconnectCallback = cb; }
  };

})();
