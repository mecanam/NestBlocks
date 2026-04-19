// ──────────────────────────────
// NestHelp — ヘルプ・チュートリアルシステム
// ──────────────────────────────
var NestHelp = (function () {

  var isOpen = false;
  var currentSection = 'start'; // 'start' | 'faq' | 'blocks' | 'connection'

  // ── ヘルプモーダルを開く ──
  function open(section) {
    currentSection = section || 'start';
    isOpen = true;
    var overlay = document.getElementById('helpOverlay');
    if (overlay) {
      overlay.classList.add('show');
      renderContent();
    }
  }

  // ── ヘルプモーダルを閉じる ──
  function close() {
    isOpen = false;
    var overlay = document.getElementById('helpOverlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  // ── コンテンツ描画 ──
  function renderContent() {
    var nav = document.getElementById('helpNav');
    var body = document.getElementById('helpBody');
    if (!nav || !body) return;

    var t = NestI18n.t;

    // ナビゲーション
    var sections = [
      { id: 'start', icon: '🚀', label: t('help.gettingStarted') },
      { id: 'faq', icon: '❓', label: t('help.faq') },
      { id: 'connection', icon: '🔌', label: '接続トラブル' }
    ];

    nav.innerHTML = '';
    for (var i = 0; i < sections.length; i++) {
      (function (sec) {
        var btn = document.createElement('button');
        btn.className = 'help-nav-item' + (sec.id === currentSection ? ' active' : '');
        btn.innerHTML = '<span class="help-nav-icon">' + sec.icon + '</span>' + sec.label;
        btn.addEventListener('click', function () {
          currentSection = sec.id;
          renderContent();
        });
        nav.appendChild(btn);
      })(sections[i]);
    }

    // ボディ
    var html = '';
    switch (currentSection) {
      case 'start':
        html = renderGettingStarted(t);
        break;
      case 'faq':
        html = renderFAQ(t);
        break;
      case 'blocks':
        html = renderBlockGuide();
        break;
      case 'connection':
        html = renderConnectionHelp();
        break;
    }
    body.innerHTML = html;

    // アコーディオン イベント
    body.querySelectorAll('.help-accordion-head').forEach(function (head) {
      head.addEventListener('click', function () {
        head.parentElement.classList.toggle('open');
      });
    });
  }

  // ── はじめに ──
  function renderGettingStarted(t) {
    return '<div class="help-section">' +
      '<h2 class="help-section-title">' + t('help.gettingStarted') + '</h2>' +
      '<div class="help-steps">' +
      renderStep(1, '📦', t('help.step1'), 'ホーム画面の「新しいプロジェクト」ボタンをクリックして、プロジェクト名を入力します。使用するボード（Pico）を選択してください。') +
      renderStep(2, '🧩', t('help.step2'), 'ブロックタブに切り替わったら、左側のツールボックスから使いたいブロックをワークスペースにドラッグします。「基本」カテゴリの「ずっと実行する」ブロックがおすすめです。') +
      renderStep(3, '🔗', t('help.step3'), 'ブロック同士をつなげてプログラムを作ります。例えば「ずっと実行する」の中に「オンボードLEDをONにする」「待つ 1秒」「オンボードLEDをOFFにする」「待つ 1秒」を入れるとLチカ完成！') +
      renderStep(4, '🚀', t('help.step4'), 'USBケーブルでPicoをパソコンに接続します。ヘッダーの「未接続」ボタンをクリックして接続し、「書き込み」ボタンでプログラムをPicoに送信します。') +
      '</div>' +
      '<div class="help-tip">' +
      '<div class="help-tip-icon">💡</div>' +
      '<div class="help-tip-text">「コード」タブに切り替えると、ブロックから自動生成されたMicroPythonコードをリアルタイムで確認できます。</div>' +
      '</div>' +
      '</div>';
  }

  function renderStep(num, icon, title, desc) {
    return '<div class="help-step">' +
      '<div class="help-step-num">' + num + '</div>' +
      '<div class="help-step-content">' +
      '<div class="help-step-icon">' + icon + '</div>' +
      '<div class="help-step-title">' + title + '</div>' +
      '<div class="help-step-desc">' + desc + '</div>' +
      '</div>' +
      '</div>';
  }

  // ── FAQ ──
  function renderFAQ(t) {
    var faqs = [
      { q: t('help.q1'), a: t('help.a1') },
      { q: t('help.q2'), a: t('help.a2') },
      { q: t('help.q3'), a: t('help.a3') },
      { q: 'ブロックを横に並べるとどうなる？', a: '複数のブロック列を横に並べると、それらは同時に実行されます（マルチタスク）。例えば、左の列でLEDを点滅させながら、右の列でセンサーの値を読み取ることができます。内部的にはMicroPythonのuasyncioを使って並行処理しています。' },
      { q: '作ったプログラムを友達にシェアしたい', a: 'ホーム画面の「ファイルを開く」ボタンから .nbl/.xml ファイルを読み込めます。プロジェクトを共有するには、設定タブの「エクスポート」でJSONファイルとして保存し、相手に送ってください。' },
      { q: 'Picoにプログラムを保存したい', a: 'ヘッダーの「書き込み」ボタンをクリックすると、プログラムがmain.pyとしてPicoに保存されます。電源を入れ直しても自動で実行されます。' },
      { q: 'BLE通信って何？', a: 'Bluetooth Low Energy（BLE）通信を使って、複数のPico同士がワイヤレスでデータをやり取りできます。「BLE通信」カテゴリのブロックを使います。同じグループ名を設定したPico同士が通信できます。' }
    ];

    var html = '<div class="help-section"><h2 class="help-section-title">' + t('help.faq') + '</h2>';
    for (var i = 0; i < faqs.length; i++) {
      html += '<div class="help-accordion">' +
        '<div class="help-accordion-head">' +
        '<span class="help-accordion-q">' + faqs[i].q + '</span>' +
        '<svg class="help-accordion-arrow" viewBox="0 0 24 24" width="16" height="16"><polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" fill="none"/></svg>' +
        '</div>' +
        '<div class="help-accordion-body">' + faqs[i].a + '</div>' +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  // ── ブロックガイド ──
  function renderBlockGuide() {
    var categories = [
      {
        name: '基本', color: '#4A90D9',
        blocks: [
          { name: '最初だけ実行する', desc: 'プログラム開始時に1回だけ実行されるブロック。初期設定に使います。' },
          { name: 'ずっと実行する', desc: '中のブロックをずっと繰り返します。複数置くと同時に動きます。' },
          { name: '待つ N 秒', desc: '指定した秒数だけプログラムを一時停止します。' }
        ]
      },
      {
        name: '出力', color: '#E8724A',
        blocks: [
          { name: 'オンボードLEDをON/OFFにする', desc: 'Pico基板上の緑色LEDを点灯・消灯します。' },
          { name: 'デジタル出力', desc: '指定したGPIOピンにHIGH(1)またはLOW(0)を出力します。外部LEDやリレーの制御に。' },
          { name: 'アナログ出力(PWM)', desc: 'LEDの明るさやモーターの速度を0〜100%で制御します。' }
        ]
      },
      {
        name: '入力', color: '#5BA0E0',
        blocks: [
          { name: 'デジタル入力', desc: '指定したGPIOピンの値(0/1)を読み取ります。ボタンやスイッチの状態を検知。' },
          { name: 'アナログ入力', desc: 'ADCピン(GP26〜28)のアナログ値を読み取ります。光センサーや温度センサーなどに。' }
        ]
      }
    ];

    var html = '<div class="help-section"><h2 class="help-section-title">ブロックガイド</h2>';
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      html += '<div class="help-block-cat">' +
        '<div class="help-block-cat-head">' +
        '<span class="help-block-dot" style="background:' + cat.color + '"></span>' +
        cat.name + '</div>';
      for (var j = 0; j < cat.blocks.length; j++) {
        html += '<div class="help-block-item">' +
          '<div class="help-block-name">' + cat.blocks[j].name + '</div>' +
          '<div class="help-block-desc">' + cat.blocks[j].desc + '</div>' +
          '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  // ── 接続トラブルシューティング ──
  function renderConnectionHelp() {
    var issues = [
      {
        title: 'Picoがポート一覧に表示されない',
        steps: [
          'USBケーブルがデータ転送対応か確認（充電専用ケーブルでは接続不可）',
          'ケーブルを抜き差しして再試行',
          'Picoに MicroPython ファームウェアがインストールされているか確認',
          '別のUSBポートに接続してみる'
        ]
      },
      {
        title: '接続後にエラーが出る',
        steps: [
          '他のアプリ（Thonny、VS Code等）がポートを使用していないか確認',
          'ブラウザのタブを一つだけにする（複数タブで同じポートは使えません）',
          'ボーレートが115200に設定されているか確認（設定タブ）'
        ]
      },
      {
        title: '書き込みに失敗する',
        steps: [
          '接続状態が「接続済み」（緑色）になっているか確認',
          'ブロックが正しく接続されているか確認（孤立したブロックがないか）',
          'Picoの電源を入れ直して再接続'
        ]
      },
      {
        title: '対応ブラウザについて',
        steps: [
          'Google Chrome 89以降 または Microsoft Edge 89以降 が必要です',
          'Safari、Firefox は Web Serial API 未対応のため使用できません',
          'スマートフォン・タブレットのブラウザには対応していません'
        ]
      }
    ];

    var html = '<div class="help-section"><h2 class="help-section-title">接続トラブルシューティング</h2>';
    for (var i = 0; i < issues.length; i++) {
      html += '<div class="help-trouble">' +
        '<div class="help-trouble-title">' + issues[i].title + '</div>' +
        '<ol class="help-trouble-steps">';
      for (var j = 0; j < issues[i].steps.length; j++) {
        html += '<li>' + issues[i].steps[j] + '</li>';
      }
      html += '</ol></div>';
    }
    html += '</div>';
    return html;
  }

  // ── 公開 API ──
  return {
    open: open,
    close: close,
    isOpen: function () { return isOpen; }
  };

})();
