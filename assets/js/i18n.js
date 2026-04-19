// ──────────────────────────────
// NestI18n — 国際化モジュール
// ──────────────────────────────
var NestI18n = (function () {

  var currentLang = 'ja';

  // ── 言語パック ──
  var langs = {
    ja: {
      // ヘッダー
      'nav.home': 'ホーム',
      'nav.workspace': 'ブロック',
      'nav.code': 'コード',
      'nav.chart': 'グラフ',
      'nav.settings': '設定',
      'connect.disconnected': '未接続',
      'connect.connected': '接続済み',
      'btn.upload': '書き込み',

      // ホーム
      'home.hero.badge': 'Raspberry Pi Pico 対応',
      'home.hero.subtitle': 'Raspberry Pi Pico のための\nビジュアルプログラミング環境。',
      'home.newProject': '新しいプロジェクト',
      'home.open': '開く',
      'home.myProjects': 'マイプロジェクト',
      'home.deleteAll': 'すべて削除',
      'home.noProjects': 'プロジェクトはまだありません',
      'home.features': 'できること',
      'home.templates': 'テンプレートから始める',

      // フィーチャー
      'feat.1.title': 'ブロックで\n組み立てる',
      'feat.1.desc': 'ドラッグ＆ドロップだけでプログラムが完成。コードの知識は必要ありません。',
      'feat.2.title': 'ワンクリックで\n書き込み・実行',
      'feat.2.desc': 'ブロックからコードをリアルタイムで生成。ケーブルをつなぐだけでワンクリック書き込み完了。',
      'feat.3.title': '同時に動かす\nマルチタスク',
      'feat.3.desc': 'ブロック列を横に並べるだけで、複数の処理を同時に実行。センサー監視とLED制御を同時に。',
      'feat.4.title': 'BLE通信で\nつながる',
      'feat.4.desc': 'Pico同士をBluetooth(BLE)で接続。教室内の複数デバイスが協調して動きます。',

      // テンプレート
      'tpl.blink': 'Lチカ',
      'tpl.blink.desc': '内蔵LEDを点滅させる基本プログラム',
      'tpl.traffic': '信号機',
      'tpl.traffic.desc': '3色LEDで信号機の動きを再現',
      'tpl.button': 'ボタン入力',
      'tpl.button.desc': 'ボタンを押してLEDをON/OFF',
      'tpl.fade': 'LED フェード',
      'tpl.fade.desc': 'PWMでLEDを滑らかに明滅',
      'tpl.temp': '温度センサー',
      'tpl.temp.desc': '内部温度センサーの値を表示',

      // ワークスペース
      'ws.blocks': 'ブロック',
      'ws.emptyTitle': 'プロジェクトを開始',
      'ws.emptyDesc': '新規プロジェクトを作成するか、既存のファイルを開いてください',
      'ws.newProject': '新規作成',
      'ws.openFile': 'ファイルを開く',
      'ws.run': '実行',

      // コード
      'code.empty': 'コードがありません',
      'code.emptyDesc': 'ブロックタブでブロックを配置すると\nMicroPython コードが自動生成されます',
      'code.goWorkspace': 'ブロックタブへ',
      'code.copy': 'コピー',
      'code.download': 'ダウンロード',

      // グラフ
      'chart.title': 'リアルタイムグラフ',
      'chart.pause': '一時停止',
      'chart.resume': '再開',
      'chart.clear': 'クリア',
      'chart.empty': 'データがありません',
      'chart.emptyDesc': '「グラフに追加」ブロックを使って\nセンサーデータをリアルタイムで可視化できます',

      // 接続モーダル
      'cm.step1.title': 'USB ケーブルで\nパソコンに接続',
      'cm.step1.desc': 'マイコン の USB ポートとパソコンを、MicroUSB ケーブルでつないでください。',
      'cm.step1.hint': '初めて接続する場合、ドライブとして認識されることがあります。そのままお進みください。',
      'cm.step1.btn': 'つないだ',
      'cm.step2.title': 'ポートを選択して\n接続ボタンを押す',
      'cm.step2.desc': '「接続する」を押すとブラウザのポート選択画面が開きます。リストから使用するマイコンを選んで接続してください。',
      'cm.step2.btn': '接続する',
      'cm.step3.title': 'マイコン に\n接続しました！',
      'cm.step3.desc': 'これでブロックプログラムを書き込めます。ブロックを組み立てて、「書き込み」ボタンを押してみましょう。',
      'cm.step3.btn': 'はじめる',

      // ダイアログ
      'dialog.newProject': '新規プロジェクト',
      'dialog.projectName': 'プロジェクト名を入力',
      'dialog.board': 'ボード',
      'dialog.cancel': 'キャンセル',
      'dialog.create': '作成',
      'dialog.ok': 'OK',
      'dialog.back': '戻る',

      // エラーメッセージ
      'err.noSerial': 'お使いのブラウザはPicoとの接続に対応していません。\nGoogle Chrome または Microsoft Edge をお使いください。',
      'err.picoNotFound': 'Picoが見つかりません。\nUSBケーブルがしっかり接続されているか確認してください。',
      'err.uploadFail': 'プログラムの書き込みに失敗しました。\nケーブルを抜き差しして、もう一度お試しください。',
      'err.connectionLost': 'Picoとの接続が切れました。\nケーブルが外れていないか確認してください。',
      'err.noCode': 'まだブロックが配置されていません。\nブロックタブでプログラムを作ってください。',
      'err.saveFail': 'プロジェクトの保存に問題がありました。\nブラウザの空き容量を確認してください。',

      // トースト
      'toast.saved': 'プロジェクトを保存しました',
      'toast.copied': 'コードをコピーしました',
      'toast.deleted': '「{name}」を削除しました',
      'toast.opened': '「{name}」を開きました',
      'toast.created': 'プロジェクト「{name}」を作成しました',
      'toast.connected': 'Pico に接続しました',
      'toast.disconnected': '切断しました',
      'toast.uploadDone': '書き込みが完了しました',
      'toast.noProject': '保存するプロジェクトがありません',
      'toast.enterName': 'プロジェクト名を入力してください',

      // ヘルプ
      'help.title': 'ヘルプ',
      'help.gettingStarted': 'はじめに',
      'help.step1': '「新しいプロジェクト」で始めましょう',
      'help.step2': 'ブロックタブで左のツールボックスからブロックをドラッグ',
      'help.step3': 'ブロックを組み合わせてプログラムを作る',
      'help.step4': 'USBケーブルでPicoをつないで「書き込み」',
      'help.faq': 'よくある質問',
      'help.q1': 'ブラウザは何を使えばいい？',
      'help.a1': 'Google Chrome または Microsoft Edge をお使いください。Safari や Firefox には対応していません。',
      'help.q2': 'Picoに接続できない',
      'help.a2': 'USBケーブルを抜き差ししてください。充電専用ケーブルでは接続できません。データ転送対応のケーブルを使ってください。',
      'help.q3': 'プロジェクトはどこに保存される？',
      'help.a3': 'このブラウザの中に自動保存されます。別のパソコンで使うには「保存」ボタンでXMLファイルをダウンロードしてください。',

      // 設定
      'settings.appearance': '外観',
      'settings.light': 'ライト',
      'settings.dark': 'ダーク',
      'settings.editor': 'エディタ',
      'settings.sound': 'サウンド',
      'settings.soundDesc': 'ブロック操作時の効果音',
      'settings.connection': '接続',
      'settings.baudRate': 'ボーレート',
      'settings.baudRateDesc': 'シリアル通信の速度',
      'settings.project': 'プロジェクト',
      'settings.export': 'エクスポート',
      'settings.import': 'インポート',
      'settings.shortcuts': 'キーボードショートカット',
      'settings.data': 'データ',
      'settings.storage': '使用容量',
      'settings.reset': '設定をリセット',
      'settings.deleteAll': 'すべてのデータを削除',
      'settings.about': 'NestBlocks について',
      'settings.version': 'バージョン',
      'settings.browser': '対応ブラウザ',
      'settings.license': 'ライセンス',

      // コンソール
      'console.title': 'コンソール',
      'console.clear': 'クリア',
      'console.ready': 'NestBlocks 準備完了',
      'console.running': '実行開始',
      'console.stopped': '停止しました',
      'console.preview': '実行開始 (プレビュー — Pico 未接続)',

      // 書き込みモーダル
      'upload.title': '書き込み中…',
      'upload.checking': '接続を確認中…',
      'upload.preparing': 'ファームウェアを準備中…',
      'upload.writing': 'コードを書き込み中…',
      'upload.verifying': 'ベリファイ中…',
      'upload.complete': '書き込みが完了しました',
      'upload.completeTitle': '書き込み完了',
      'upload.errorTitle': '書き込みエラー',
      'upload.close': '閉じる',

      // 拡張機能
      'ext.title': '拡張機能',
      'ext.subtitle': 'プロジェクトに機能を追加',
      'ext.empty': '利用可能な拡張機能はありません',

      // 印刷
      'print.title': '印刷設定',
      'print.includeCode': 'Python コードを含める',
      'print.btn': '印刷',
    },

    en: {
      'nav.home': 'Home',
      'nav.workspace': 'Blocks',
      'nav.code': 'Code',
      'nav.chart': 'Chart',
      'nav.settings': 'Settings',
      'connect.disconnected': 'Disconnected',
      'connect.connected': 'Connected',
      'btn.upload': 'Upload',

      'home.hero.badge': 'Raspberry Pi Pico Support',
      'home.hero.subtitle': 'Visual programming environment\nfor Raspberry Pi Pico.',
      'home.newProject': 'New Project',
      'home.open': 'Open',
      'home.myProjects': 'My Projects',
      'home.deleteAll': 'Delete All',
      'home.noProjects': 'No projects yet',
      'home.features': 'Features',
      'home.templates': 'Start from Template',

      'feat.1.title': 'Build with\nBlocks',
      'feat.1.desc': 'Create programs with drag & drop. No coding experience needed.',
      'feat.2.title': 'One-click\nUpload & Run',
      'feat.2.desc': 'Code is generated in real-time from blocks. Just plug in and click upload.',
      'feat.3.title': 'Multitask\nSimultaneously',
      'feat.3.desc': 'Place block sequences side by side to run multiple tasks concurrently.',
      'feat.4.title': 'Connect via\nBLE',
      'feat.4.desc': 'Connect Picos via Bluetooth (BLE). Multiple devices in a classroom work together.',

      'tpl.blink': 'Blink',
      'tpl.blink.desc': 'Basic LED blinking program',
      'tpl.traffic': 'Traffic Light',
      'tpl.traffic.desc': 'Simulate a traffic light with 3 LEDs',
      'tpl.button': 'Button Input',
      'tpl.button.desc': 'Toggle LED with a button press',
      'tpl.fade': 'LED Fade',
      'tpl.fade.desc': 'Smooth LED dimming with PWM',
      'tpl.temp': 'Temperature',
      'tpl.temp.desc': 'Read the internal temperature sensor',

      'ws.blocks': 'blocks',
      'ws.emptyTitle': 'Start a Project',
      'ws.emptyDesc': 'Create a new project or open an existing file',
      'ws.newProject': 'New Project',
      'ws.openFile': 'Open File',
      'ws.run': 'Run',

      'code.empty': 'No Code',
      'code.emptyDesc': 'Place blocks in the Blocks tab to\nauto-generate MicroPython code',
      'code.goWorkspace': 'Go to Blocks',
      'code.copy': 'Copy',
      'code.download': 'Download',

      'chart.title': 'Real-time Chart',
      'chart.pause': 'Pause',
      'chart.resume': 'Resume',
      'chart.clear': 'Clear',
      'chart.empty': 'No Data',
      'chart.emptyDesc': 'Use "Add to Graph" block to\nvisualize sensor data in real-time',

      'err.noSerial': 'Your browser doesn\'t support Pico connection.\nPlease use Google Chrome or Microsoft Edge.',
      'err.picoNotFound': 'Pico not found.\nPlease check your USB cable connection.',
      'err.uploadFail': 'Failed to upload program.\nTry unplugging and reconnecting the cable.',
      'err.connectionLost': 'Connection to Pico was lost.\nPlease check your cable.',
      'err.noCode': 'No blocks placed yet.\nBuild a program in the Blocks tab first.',
      'err.saveFail': 'Could not save project.\nPlease check your browser storage.',

      'toast.saved': 'Project saved',
      'toast.copied': 'Code copied',
      'toast.deleted': '"{name}" deleted',
      'toast.opened': '"{name}" opened',
      'toast.created': 'Project "{name}" created',
      'toast.connected': 'Connected to Pico',
      'toast.disconnected': 'Disconnected',
      'toast.uploadDone': 'Upload complete',
      'toast.noProject': 'No project to save',
      'toast.enterName': 'Please enter a project name',

      'help.title': 'Help',
      'help.gettingStarted': 'Getting Started',
      'help.step1': 'Click "New Project" to begin',
      'help.step2': 'Drag blocks from the toolbox on the left',
      'help.step3': 'Connect blocks together to create a program',
      'help.step4': 'Connect Pico via USB and click "Upload"',
      'help.faq': 'FAQ',
      'help.q1': 'Which browser should I use?',
      'help.a1': 'Use Google Chrome or Microsoft Edge. Safari and Firefox are not supported.',
      'help.q2': 'Can\'t connect to Pico',
      'help.a2': 'Try unplugging and replugging the USB cable. Make sure to use a data cable, not a charge-only cable.',
      'help.q3': 'Where are projects saved?',
      'help.a3': 'Projects are auto-saved in your browser. To use on another computer, download the XML file using the Save button.',

      'dialog.newProject': 'New Project',
      'dialog.projectName': 'Enter project name',
      'dialog.board': 'Board',
      'dialog.cancel': 'Cancel',
      'dialog.create': 'Create',
      'dialog.ok': 'OK',
      'dialog.back': 'Back',

      'settings.appearance': 'Appearance',
      'settings.light': 'Light',
      'settings.dark': 'Dark',
      'settings.editor': 'Editor',
      'settings.sound': 'Sound',
      'settings.soundDesc': 'Sound effects for block operations',
      'settings.connection': 'Connection',
      'settings.baudRate': 'Baud Rate',
      'settings.baudRateDesc': 'Serial communication speed',
      'settings.project': 'Projects',
      'settings.export': 'Export',
      'settings.import': 'Import',
      'settings.shortcuts': 'Keyboard Shortcuts',
      'settings.data': 'Data',
      'settings.storage': 'Storage',
      'settings.reset': 'Reset Settings',
      'settings.deleteAll': 'Delete All Data',
      'settings.about': 'About NestBlocks',
      'settings.version': 'Version',
      'settings.browser': 'Supported Browsers',
      'settings.license': 'License',

      'console.title': 'Console',
      'console.clear': 'Clear',
      'console.ready': 'NestBlocks ready',
      'console.running': 'Running',
      'console.stopped': 'Stopped',
      'console.preview': 'Running (Preview — Pico not connected)',

      'upload.title': 'Uploading…',
      'upload.checking': 'Checking connection…',
      'upload.preparing': 'Preparing firmware…',
      'upload.writing': 'Writing code…',
      'upload.verifying': 'Verifying…',
      'upload.complete': 'Upload complete',
      'upload.completeTitle': 'Upload Complete',
      'upload.errorTitle': 'Upload Error',
      'upload.close': 'Close',

      'ext.title': 'Extensions',
      'ext.subtitle': 'Add features to your project',
      'ext.empty': 'No extensions available',

      'print.title': 'Print Settings',
      'print.includeCode': 'Include Python code',
      'print.btn': 'Print',
    }
  };

  // ── テキスト取得 ──
  function t(key, params) {
    var pack = langs[currentLang] || langs['ja'];
    var text = pack[key] || langs['ja'][key] || key;

    // パラメータ置換: {name} → 実際の値
    if (params) {
      for (var k in params) {
        if (params.hasOwnProperty(k)) {
          text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
        }
      }
    }
    return text;
  }

  // ── 言語設定 ──
  function setLang(lang) {
    if (!langs[lang]) lang = 'ja';
    currentLang = lang;
    localStorage.setItem('nb-lang', lang);
    applyToDOM();
  }

  function getLang() {
    return currentLang;
  }

  // ── DOM に反映（data-i18n 属性を持つ要素を更新）──
  function applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var text = t(key);
      if (el.tagName === 'INPUT' && el.type !== 'checkbox') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });

    // data-i18n-title 属性（ツールチップ）
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
  }

  // ── 初期化 ──
  function init() {
    var saved = localStorage.getItem('nb-lang');
    if (saved && langs[saved]) {
      currentLang = saved;
    } else {
      // ブラウザの言語設定を検出
      var browserLang = (navigator.language || navigator.userLanguage || 'ja').substring(0, 2);
      currentLang = langs[browserLang] ? browserLang : 'ja';
    }
  }

  // ── 利用可能な言語一覧 ──
  function getAvailableLangs() {
    return Object.keys(langs);
  }

  init();

  // ── 公開 API ──
  return {
    t: t,
    setLang: setLang,
    getLang: getLang,
    applyToDOM: applyToDOM,
    getAvailableLangs: getAvailableLangs
  };

})();
