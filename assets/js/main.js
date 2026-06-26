// ──────────────────────────────
// ドキュメントサイト URL（GitHub Pages デプロイ後に更新）
// ──────────────────────────────
var DOCS_URL = 'https://mecanam.github.io/NestBlocks_Document/';

// ──────────────────────────────
// プロジェクト管理（IndexedDB ベース）
// ──────────────────────────────
var currentProject = null; // 現在のプロジェクト
var autoSaveTimer = null;

// ── 自動保存（IndexedDB に保存）──
function autoSaveCurrentProject() {
  if (!currentProject || !window.blocklyWorkspace) return;

  var xml = Blockly.Xml.workspaceToDom(window.blocklyWorkspace);
  xml.setAttribute('data-board', currentProject.boardType || 'pico');
  // 有効なプラグイン情報を保存
  var enabledPlugins = NestPlugins.getEnabled();
  xml.setAttribute('data-plugins', enabledPlugins.join(','));
  currentProject.xml = Blockly.Xml.domToText(xml);
  currentProject.plugins = enabledPlugins;
  currentProject.updatedAt = new Date().toISOString();

  NestDB.save(currentProject).then(function (saved) {
    // save が id を振るので反映
    currentProject.id = saved.id;
    renderProjectGrid();
    updateStorageInfo();
  }).catch(function (err) {
    console.error('[autoSave] 保存エラー:', err);
  });
}

// デバウンス付き自動保存（ワークスペース変更時に呼ぶ）
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(autoSaveCurrentProject, 1500);
}

function deleteProject(id) {
  NestDB.remove(id).then(function () {
    renderProjectGrid();
    updateStorageInfo();
  });
}

// ── ホーム画面: プロジェクトグリッド描画 ──
function renderProjectGrid() {
  var grid = document.getElementById('projectGrid');
  if (!grid) return;

  NestDB.getAll().then(function (projects) {
    grid.innerHTML = '';

    // 統計を更新
    var statEl = document.getElementById('statProjects');
    if (statEl) statEl.textContent = projects.length;

    // プロジェクト一覧: あるときだけ表示
    var projectsEl = document.getElementById('homeProjects');

    if (projects.length === 0) {
      if (projectsEl) projectsEl.style.display = 'none';
      return;
    }

    if (projectsEl) projectsEl.style.display = '';

    for (var i = 0; i < projects.length; i++) {
      (function(proj) {
        var card = document.createElement('div');
        card.className = 'pcard';
        if (currentProject && currentProject.id === proj.id) {
          card.className += ' current';
        }

        var boardLabel = proj.boardType === 'nestcore' ? 'PicoNest' : 'Pico';
        var date = new Date(proj.updatedAt);
        var dateStr = (date.getMonth() + 1) + '/' + date.getDate() + ' ' +
                      ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);

        card.innerHTML =
          '<div class="pi">📦</div>' +
          '<div class="pn">' + escapeHtml(proj.name) + '</div>' +
          '<div class="pm">' + boardLabel + ' · ' + dateStr + '</div>' +
          '<div class="pd" title="削除">×</div>';

        card.addEventListener('click', function(e) {
          if (e.target.classList.contains('pd')) return;
          openProject(proj.id);
        });

        card.querySelector('.pd').addEventListener('click', function(e) {
          e.stopPropagation();
          deleteProject(proj.id);
          toast('「' + proj.name + '」を削除しました');
        });

        grid.appendChild(card);
      })(projects[i]);
    }
  });
}

function openProject(id) {
  NestDB.getById(id).then(function (proj) {
    if (!proj) return;

    currentProject = {
      id: proj.id,
      name: proj.name,
      boardType: proj.boardType || 'pico',
      xml: proj.xml,
      plugins: proj.plugins || [],
      createdAt: proj.createdAt,
      updatedAt: proj.updatedAt
    };

    // プロジェクトに記録されたプラグインを復元
    restoreProjectPlugins(currentProject);

    switchTab('workspace');
    showWorkspace();
    loadProjectToWorkspace();
    updateProjectName(proj.name);
    renderProjectGrid();
    toast('「' + proj.name + '」を開きました');
  });
}

// ── ストレージ情報更新 ──
function updateStorageInfo() {
  NestDB.count().then(function (n) {
    var infoEl = document.getElementById('storageInfo');
    if (infoEl) {
      infoEl.textContent = 'プロジェクト: ' + n + '件';
    }
  });
}

// ──────────────────────────────
// タブ切替
// ──────────────────────────────
function switchTab(id) {
  document.querySelectorAll('.nav-item').forEach(function (n) {
    n.classList.remove('active');
  });
  var nav = document.querySelector('[data-tab="' + id + '"]');
  if (nav) nav.classList.add('active');

  document.querySelectorAll('.tab-panel').forEach(function (p) {
    p.classList.remove('active');
  });
  var panel = document.getElementById(id);
  if (panel) panel.classList.add('active');

  // ワークスペースタブに切り替えた時にBlocklyを初期化/リサイズ
  if (id === 'workspace') {
    if (!window.blocklyWorkspace) {
      initBlockly();
    } else {
      // 非表示中のリサイズに対応するため再計算
      Blockly.svgResize(window.blocklyWorkspace);
    }
  }

  // グラフタブに切り替えた時にリサイズ＋延期された更新を実行
  if (id === 'chart') {
    var keys = Object.keys(_chartInstances);
    for (var i = 0; i < keys.length; i++) {
      _chartInstances[keys[i]].chart.resize();
    }
    if (_chartNeedsUpdate) {
      _chartNeedsUpdate = false;
      for (var j = 0; j < keys.length; j++) {
        _chartInstances[keys[j]].chart.update('none');
      }
    }
  }
}

document.querySelectorAll('.nav-item').forEach(function (n) {
  n.addEventListener('click', function () {
    switchTab(n.dataset.tab);
  });
});


// ──────────────────────────────
// テーマ（ライト / ダーク）
// ──────────────────────────────
function setTheme(theme) {
  if (theme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
  } else {
    document.body.removeAttribute('data-theme');
  }
  document.querySelectorAll('.theme-opt').forEach(function (o) {
    o.classList.toggle('active', o.dataset.theme === theme);
  });
  localStorage.setItem('nb-theme', theme);

  // Blocklyワークスペースのテーマも更新
  if (window.blocklyWorkspace) {
    applyBlocklyTheme(theme);
  }
}

function toggleTheme() {
  var isDark = document.body.getAttribute('data-theme') === 'dark';
  setTheme(isDark ? 'light' : 'dark');
}

document.querySelectorAll('.theme-opt').forEach(function (o) {
  o.addEventListener('click', function () {
    setTheme(o.dataset.theme);
  });
});

// 起動時にテーマを復元
setTheme(localStorage.getItem('nb-theme') || 'light');


// ──────────────────────────────
// トースト通知
// ──────────────────────────────
function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function () {
    t.classList.remove('show');
  }, 2500);
}


// ──────────────────────────────
// ボトムパネル（開閉・リサイズ・タブ）
// ──────────────────────────────
function togglePanel() {
  document.getElementById('bottomPanel').classList.toggle('collapsed');
  // パネル開閉後にBlocklyワークスペースをリサイズ
  if (window.blocklyWorkspace) {
    setTimeout(function() {
      Blockly.svgResize(window.blocklyWorkspace);
    }, 0);
  }
}


// ──────────────────────────────
// Blockly テーマ適用
// ──────────────────────────────
function applyBlocklyTheme(theme) {
  if (!window.blocklyWorkspace) return;

  var isDark = theme === 'dark';

  // ユニークなテーマ名を使用して毎回新しく定義
  var themeName = 'customTheme_' + theme + '_' + Date.now();

  // Blocklyのカスタムテーマを定義
  var customTheme = Blockly.Theme.defineTheme(themeName, {
    'base': Blockly.Themes.Classic,
    'componentStyles': {
      'workspaceBackgroundColour': isDark ? '#181818' : '#EAE8E3',
      'toolboxBackgroundColour': isDark ? '#121212' : '#F2F0EB',
      'toolboxForegroundColour': isDark ? '#ffffffea' : '#111111',
      'flyoutBackgroundColour': isDark ? '#1a1a1a' : '#EAE8E3',
      'flyoutForegroundColour': isDark ? '#a7a7a7' : '#111111',
      'flyoutOpacity': 1,
      'scrollbarColour': isDark ? '#3a3a3a' : '#d0d0d0',
      'scrollbarOpacity': 0.6,
      'insertionMarkerColour': '#ffffff',
      'insertionMarkerOpacity': 0.3,
      'markerColour': '#D94510',
      'cursorColour': '#D94510'
    },
    'categoryStyles': {
      'logic_category': { 'colour': '#8B6FE8' },
      'loop_category': { 'colour': '#8CB43D' },
      'math_category': { 'colour': '#5BA0E0' },
      'variable_category': { 'colour': '#E05A5A' },
      'text_category': { 'colour': '#5DC06C' }
    },
    'blockStyles': {
      'logic_blocks': { 'colourPrimary': '#8B6FE8' },
      'loop_blocks': { 'colourPrimary': '#8CB43D' },
      'math_blocks': { 'colourPrimary': '#5BA0E0' },
      'variable_blocks': { 'colourPrimary': '#E05A5A' },
      'text_blocks': { 'colourPrimary': '#5DC06C' }
    }
  });

  window.blocklyWorkspace.setTheme(customTheme);

  // ワークスペースを再描画して変更を確実に反映
  window.blocklyWorkspace.resize();
}


// ──────────────────────────────
// Blockly ワークスペース初期化
// ──────────────────────────────
function initBlockly() {
  if (window.blocklyWorkspace) return; // 既に初期化済みの場合は何もしない

  // 現在のテーマを取得
  var currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  var isDark = currentTheme === 'dark';

  // 設定を取得
  var sound = localStorage.getItem('nb-sound') || 'off';

  // ユニークなテーマ名を使用
  var themeName = 'customTheme_' + currentTheme + '_init';

  // Blocklyのカスタムテーマを定義
  var customTheme = Blockly.Theme.defineTheme(themeName, {
    'base': Blockly.Themes.Classic,
    'componentStyles': {
      'workspaceBackgroundColour': isDark ? '#181818' : '#EAE8E3',
      'toolboxBackgroundColour': isDark ? '#121212' : '#F2F0EB',
      'toolboxForegroundColour': isDark ? '#ffffffea' : '#111111',
      'flyoutBackgroundColour': isDark ? '#1a1a1a' : '#EAE8E3',
      'flyoutForegroundColour': isDark ? '#a7a7a7' : '#111111',
      'flyoutOpacity': 1,
      'scrollbarColour': isDark ? '#3a3a3a' : '#d0d0d0',
      'scrollbarOpacity': 0.6,
      'insertionMarkerColour': '#ffffff',
      'insertionMarkerOpacity': 0.3,
      'markerColour': '#D94510',
      'cursorColour': '#D94510'
    },
    'categoryStyles': {
      'logic_category': { 'colour': '#8B6FE8' },
      'loop_category': { 'colour': '#8CB43D' },
      'math_category': { 'colour': '#5BA0E0' },
      'variable_category': { 'colour': '#E05A5A' },
      'text_category': { 'colour': '#5DC06C' }
    },
    'blockStyles': {
      'logic_blocks': { 'colourPrimary': '#8B6FE8' },
      'loop_blocks': { 'colourPrimary': '#8CB43D' },
      'math_blocks': { 'colourPrimary': '#5BA0E0' },
      'variable_blocks': { 'colourPrimary': '#E05A5A' },
      'text_blocks': { 'colourPrimary': '#5DC06C' }
    }
  });

  // Blockly ワークスペースを作成
  window.blocklyWorkspace = Blockly.inject('blocklyDiv', {
    toolbox: TOOLBOX_CONFIG,
    renderer: 'zelos',
    theme: customTheme,
    sounds: (sound === 'on'),
    grid: {
      spacing: 20,
      length: 3,
      colour: isDark ? '#2a2a2a' : '#ccc8c0',
      snap: true
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1.0,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.2
    },
    trashcan: true,
    move: {
      scrollbars: true,
      drag: true,
      wheel: false
    }
  });

  // ワークスペース変更イベントのリスナー
  window.blocklyWorkspace.addChangeListener(function(event) {
    if (event.type === Blockly.Events.VIEWPORT_CHANGE) {
      updateZoomLevel();
      return;
    }
    // UIイベント（ツールボックス操作・クリック等）はスキップ
    // workspaceToCode() がフライアウト描画と干渉するのを防ぐ
    if (event.isUiEvent) return;

    updateBlockCount();
    updateCodePreview();
    // ブロック操作時に自動保存をスケジュール
    if (event.type === Blockly.Events.BLOCK_CHANGE ||
        event.type === Blockly.Events.BLOCK_CREATE ||
        event.type === Blockly.Events.BLOCK_DELETE ||
        event.type === Blockly.Events.BLOCK_MOVE ||
        event.type === Blockly.Events.VAR_CREATE ||
        event.type === Blockly.Events.VAR_DELETE ||
        event.type === Blockly.Events.VAR_RENAME) {
      scheduleAutoSave();
    }
  });

  // 「拡張機能」カテゴリのクリックを検知してモーダルを開く
  window.blocklyWorkspace.addChangeListener(function (event) {
    if (event.type === Blockly.Events.TOOLBOX_ITEM_SELECT && event.newItem === '拡張機能') {
      // カテゴリ選択を即座に解除してモーダルを開く
      setTimeout(function () {
        window.blocklyWorkspace.getToolbox().clearSelection();
        showPluginModal();
      }, 0);
    }
  });

  toast('Blockly ワークスペースを初期化しました');
}

// ズーム率を更新
function updateZoomLevel() {
  if (!window.blocklyWorkspace) return;
  var scale = window.blocklyWorkspace.scale;
  document.getElementById('zoomLevel').textContent = Math.round(scale * 100) + '%';
}

// ブロック数を更新
function updateBlockCount() {
  if (!window.blocklyWorkspace) return;
  var count = window.blocklyWorkspace.getAllBlocks(false).length;
  document.getElementById('blockCount').textContent = count + ' ブロック';
}

// コードにシンタックスハイライトを適用
function highlightCode(code) {
  if (window.Prism && Prism.languages.python) {
    return Prism.highlight(code, Prism.languages.python, 'python');
  }
  return escapeHtml(code);
}

// ──────────────────────────────
// コード生成ラッパー（常時非同期）
// ──────────────────────────────
function generateCode() {
  if (!window.blocklyWorkspace) return '';

  // ジェネレーター初期化
  _asyncFuncNames = {};
  Blockly.Python.init(window.blocklyWorkspace);

  // 全トップレベルブロックを取得（位置順ソート済み）
  var topBlocks = window.blocklyWorkspace.getTopBlocks(true);

  // 各ブロック列のコードを生成（BLE受信ハンドラーと通常タスクを分離）
  var tasks = [];
  var bleHandlers = [];
  for (var i = 0; i < topBlocks.length; i++) {
    var block = topBlocks[i];
    var code = Blockly.Python.blockToCode(block);
    if (Array.isArray(code)) code = code[0];
    if (code && code.trim()) {
      if (block.type === 'ble_on_number' || block.type === 'ble_on_string' || block.type === 'ble_on_value' || block.type === 'ble_on_list') {
        bleHandlers.push(code);
      } else {
        tasks.push({ code: code, isForever: block.type === 'forever_loop' });
      }
    }
  }

  // タスクもBLEハンドラーもなければ空文字を返す
  if (tasks.length === 0 && bleHandlers.length === 0) {
    Blockly.Python.isInitialized = false;
    if (Blockly.Python.nameDB_) Blockly.Python.nameDB_.reset();
    return '';
  }

  // uasyncio は常にインポート
  Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';

  // 変数の初期値を None から 0 に変更（None のまま演算するとTypeErrorになるため）
  if (Blockly.Python.definitions_['variables']) {
    Blockly.Python.definitions_['variables'] =
      Blockly.Python.definitions_['variables'].replace(/= None/g, '= 0');
  }

  // 変数名を抽出（global 宣言用）— 先に抽出しておく
  var globalVars = [];
  if (Blockly.Python.definitions_['variables']) {
    var varLines = Blockly.Python.definitions_['variables'].split('\n');
    for (var v = 0; v < varLines.length; v++) {
      var match = varLines[v].match(/^(\w+)\s*=/);
      if (match) globalVars.push(match[1]);
    }
  }

  // definitions_ をインポートとセットアップに分離
  var imports = [];
  var setupDefs = [];
  for (var name in Blockly.Python.definitions_) {
    var def = Blockly.Python.definitions_[name];
    if (def.match(/^(from\s+\S+\s+)?import\s+\S+/)) {
      imports.push(def);
    } else {
      // カスタム関数（% プレフィックス）に global 宣言を注入
      if (name.charAt(0) === '%' && globalVars.length > 0) {
        def = def.replace(
          /((?:async )?def \w+\([^)]*\):\n)/,
          '$1  global ' + globalVars.join(', ') + '\n'
        );
        Blockly.Python.definitions_[name] = def;
      }
      setupDefs.push(def);
    }
  }

  // 各ブロック列を async def task_N() でラップ（1回実行とループを分離）
  var funcCode = '';
  var setupNames = [];
  var loopNames = [];
  for (var t = 0; t < tasks.length; t++) {
    var funcName = 'task_' + t;
    if (tasks[t].isForever) {
      loopNames.push(funcName);
    } else {
      setupNames.push(funcName);
    }
    var globalDecl = '';
    if (globalVars.length > 0) {
      globalDecl = '  global ' + globalVars.join(', ') + '\n';
    }
    var indented = Blockly.Python.prefixLines(tasks[t].code, Blockly.Python.INDENT);
    funcCode += 'async def ' + funcName + '():\n' + globalDecl + indented + '\n';
  }

  // main() 関数: 1回実行を先に、その後ループを並行実行
  var mainFunc = 'async def main():\n';
  for (var s = 0; s < setupNames.length; s++) {
    mainFunc += '  await ' + setupNames[s] + '()\n';
  }
  if (loopNames.length > 0) {
    var gatherArgs = loopNames.map(function(n) { return n + '()'; }).join(', ');
    mainFunc += '  await uasyncio.gather(' + gatherArgs + ')\n';
  }

  // BLE使用チェック
  var hasBle = !!Blockly.Python.definitions_['ble_setup'];

  // 最終コードを組み立て
  var finalCode = '';
  if (imports.length > 0) {
    finalCode += imports.join('\n') + '\n\n';
  }
  if (setupDefs.length > 0) {
    finalCode += setupDefs.join('\n\n') + '\n\n';
  }
  // BLE受信ハンドラー（デコレーター関数）— global 宣言を注入
  if (bleHandlers.length > 0) {
    for (var bh = 0; bh < bleHandlers.length; bh++) {
      var handler = bleHandlers[bh];
      if (globalVars.length > 0) {
        // "def _on_xxx(...):\n" の直後（_ble_list 解析行がある場合はその後）に global 宣言を挿入
        handler = handler.replace(
          /(def _on_\w+\([^)]*\):\n(?:  _ble_list = [^\n]+\n)?)/,
          '$1  global ' + globalVars.join(', ') + '\n'
        );
      }
      finalCode += handler + '\n';
    }
  }
  finalCode += funcCode;
  if (tasks.length > 0) {
    finalCode += mainFunc + '\n';
    if (hasBle) {
      finalCode += 'uasyncio.run(ble.start(main()))\n';
    } else {
      finalCode += 'uasyncio.run(main())\n';
    }
  } else if (hasBle) {
    finalCode += 'uasyncio.run(ble.start())\n';
  }

  // クリーンアップ
  Blockly.Python.isInitialized = false;
  if (Blockly.Python.nameDB_) Blockly.Python.nameDB_.reset();

  return finalCode;
}

// コードプレビューのフォントサイズ変更
var _codeFontSize = 12; // デフォルト 12px
var _CODE_FONT_MIN = 8;
var _CODE_FONT_MAX = 28;

function changeCodeFontSize(delta) {
  _codeFontSize = Math.max(_CODE_FONT_MIN, Math.min(_CODE_FONT_MAX, _codeFontSize + delta));
  var ln = document.getElementById('lineNumbers');
  var cc = document.getElementById('codeContent');
  if (ln) ln.style.fontSize = _codeFontSize + 'px';
  if (cc) cc.style.fontSize = _codeFontSize + 'px';
}

// コードプレビューを更新
function updateCodePreview() {
  if (!window.blocklyWorkspace) return;
  var code = generateCode();

  // コードタブを更新
  if (code) {
    document.getElementById('codeEmpty').style.display = 'none';
    document.getElementById('codeEditor').style.display = 'flex';
    document.getElementById('codeContent').innerHTML = highlightCode(code);

    // 行番号を生成
    var lines = code.split('\n').length;
    var lineNumbers = '';
    for (var i = 1; i <= lines; i++) {
      lineNumbers += i + '\n';
    }
    document.getElementById('lineNumbers').textContent = lineNumbers;

    // 統計を更新
    document.getElementById('codeStats').textContent = lines + ' 行 · ' + code.length + ' 文字';
  } else {
    document.getElementById('codeEmpty').style.display = 'flex';
    document.getElementById('codeEditor').style.display = 'none';
  }
}


// ──────────────────────────────
// スタブ関数（TODO: 実装してください）
// ──────────────────────────────

// ── ボード選択ヘルパー ──
function getSelectedBoardType() {
  var select = document.getElementById('boardSelect');
  return select ? select.value : 'pico';
}

// ホーム - 新規作成モーダル
function showNewProjectModal() {
  document.getElementById('newProjectOverlay').classList.add('show');
  document.getElementById('newProjectInput').value = '';
  document.getElementById('newProjectInput').focus();
  // ボード選択をデフォルト(Pico)にリセット
  var boardSelect = document.getElementById('boardSelect');
  if (boardSelect) boardSelect.value = 'pico';
}

function closeNewProject() {
  document.getElementById('newProjectOverlay').classList.remove('show');
}

// 汎用確認モーダル（Promise ベース）
function showConfirm(title, message) {
  return new Promise(function (resolve) {
    var overlay = document.getElementById('confirmOverlay');
    var okBtn = document.getElementById('confirmOkBtn');
    var cancelBtn = document.getElementById('confirmCancelBtn');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = message;
    overlay.classList.add('show');

    function cleanup(result) {
      overlay.classList.remove('show');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onBg);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onBg(e) { if (e.target === overlay) cleanup(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onBg);
  });
}

function createNewProject() {
  var projectName = document.getElementById('newProjectInput').value.trim();

  if (!projectName) {
    toast('プロジェクト名を入力してください');
    return;
  }

  // 同名プロジェクトが既に存在するかチェック
  NestDB.getByName(projectName).then(function (existing) {
    if (existing) {
      showConfirm('プロジェクトの重複',
        '「' + projectName + '」は既に存在しています。上書きしますか？'
      ).then(function (ok) {
        if (ok) doCreateNewProject(projectName);
      });
    } else {
      doCreateNewProject(projectName);
    }
  });
}

// ── プロジェクトのプラグインを復元 ──
function restoreProjectPlugins(project) {
  var plugins = project.plugins || [];
  // XMLから読み取ったプラグイン情報でも補完
  if (plugins.length === 0 && project.xml) {
    try {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(project.xml, 'text/xml');
      var rootEl = xmlDoc.documentElement;
      if (rootEl && rootEl.getAttribute('data-plugins')) {
        plugins = rootEl.getAttribute('data-plugins').split(',').filter(function (s) { return s; });
      }
    } catch (e) { /* ignore */ }
  }
  NestPlugins.setEnabledList(plugins);
}

function doCreateNewProject(projectName) {
  // 編集中のプロジェクトがあれば先に自動保存してからクリアする
  if (currentProject && window.blocklyWorkspace) {
    autoSaveCurrentProject();
    window.blocklyWorkspace.clear();
  }

  // 新規プロジェクトは全プラグインを無効化して開始
  NestPlugins.disableAll();

  // 新規プロジェクトを作成
  var boardType = getSelectedBoardType();
  currentProject = {
    name: projectName,
    boardType: boardType,
    plugins: [],
    xml: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // モーダルを閉じる
  closeNewProject();

  // ワークスペースタブに切り替え
  switchTab('workspace');

  // ワークスペースを初期化
  showWorkspace();

  // 「ずっと実行する」ブロックを初期配置する
  if (window.blocklyWorkspace) {
    try {
      var initXml = '<xml><block type="forever_loop" x="80" y="60"></block></xml>';
      var dom = Blockly.utils.xml.textToDom(initXml);
      Blockly.Xml.domToWorkspace(dom, window.blocklyWorkspace);
    } catch (e) { /* ignore */ }
  }

  // プロジェクト名を表示
  updateProjectName(projectName);

  toast('プロジェクト「' + projectName + '」を作成しました');
}

// ファイルを開く
function openFileProject() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xml';

  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(event) {
      try {
        var xmlText = event.target.result;

        // プロジェクト名をファイル名から取得
        var projectName = file.name.replace('.xml', '');

        // XMLからボード種別とプラグイン情報を取得
        var boardType = 'pico';
        var plugins = [];
        try {
          var parser = new DOMParser();
          var xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          var rootEl = xmlDoc.documentElement;
          if (rootEl && rootEl.getAttribute('data-board')) {
            boardType = rootEl.getAttribute('data-board');
          }
          if (rootEl && rootEl.getAttribute('data-plugins')) {
            plugins = rootEl.getAttribute('data-plugins').split(',').filter(function (s) { return s; });
          }
        } catch (e) { /* デフォルト pico */ }

        // プロジェクトを作成して IndexedDB に保存
        currentProject = {
          name: projectName,
          boardType: boardType,
          plugins: plugins,
          xml: xmlText,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // プラグインを復元
        restoreProjectPlugins(currentProject);

        NestDB.save(currentProject).then(function (saved) {
          currentProject.id = saved.id;

          // ワークスペースタブに切り替え
          switchTab('workspace');

          // ワークスペースを初期化してXMLを読み込み
          showWorkspace();
          loadProjectToWorkspace();

          // プロジェクト名を表示
          updateProjectName(projectName);
          renderProjectGrid();
          updateStorageInfo();

          toast('「' + projectName + '」を開きました');
        });
      } catch (error) {
        console.error('ファイル読み込みエラー:', error);
        toast('ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

function clearAllProjects() {
  showConfirm('すべて削除', 'マイプロジェクトをすべて削除しますか？この操作は取り消せません。').then(function (ok) {
    if (!ok) return;
    NestDB.clear().then(function () {
      renderProjectGrid();
      updateStorageInfo();
      toast('すべてのプロジェクトを削除しました');
    });
  });
}
function loadTemplate(id)    { toast('TODO: テンプレート読込 → ' + id); }

// プロジェクト名を更新
function updateProjectName(name) {
  var projectNameEl = document.getElementById('projectName');
  if (projectNameEl) {
    projectNameEl.textContent = name;
  }
}

// ワークスペースの表示切り替え
function showWorkspace() {
  // 空の状態を非表示
  document.getElementById('workspaceEmpty').style.display = 'none';

  // Blocklyワークスペースを初期化（まだ初期化されていない場合）
  if (!window.blocklyWorkspace) {
    initBlockly();
  }

  // ボード別ツールボックスを適用
  if (window.blocklyWorkspace && currentProject) {
    var toolbox = getToolboxConfig(currentProject.boardType || 'pico');
    window.blocklyWorkspace.updateToolbox(toolbox);
  }

  // リサイズして確実に表示
  if (window.blocklyWorkspace) {
    window.blocklyWorkspace.resize();
  }
}

function hideWorkspace() {
  // 空の状態を表示
  document.getElementById('workspaceEmpty').style.display = 'flex';
}

// プロジェクトをワークスペースに読み込む
function loadProjectToWorkspace() {
  if (!currentProject || !currentProject.xml || !window.blocklyWorkspace) {
    return;
  }

  try {
    var xml = Blockly.utils.xml.textToDom(currentProject.xml);
    window.blocklyWorkspace.clear();
    Blockly.Xml.domToWorkspace(xml, window.blocklyWorkspace);
  } catch (error) {
    console.error('ワークスペース読み込みエラー:', error);
    toast('プロジェクトの読み込みに失敗しました');
  }
}

// プロジェクトを保存（IndexedDB に保存 + XMLダウンロード）
function saveCurrentProject() {
  if (!currentProject || !window.blocklyWorkspace) {
    toast('保存するプロジェクトがありません');
    return;
  }

  // ワークスペースのXMLを取得（ボード種別 + プラグイン情報を埋め込み）
  var xml = Blockly.Xml.workspaceToDom(window.blocklyWorkspace);
  xml.setAttribute('data-board', currentProject.boardType || 'pico');
  var enabledPlugins = NestPlugins.getEnabled();
  xml.setAttribute('data-plugins', enabledPlugins.join(','));
  currentProject.xml = Blockly.Xml.domToText(xml);
  currentProject.plugins = enabledPlugins;
  currentProject.updatedAt = new Date().toISOString();

  // IndexedDB に保存
  NestDB.save(currentProject).then(function (saved) {
    currentProject.id = saved.id;
    renderProjectGrid();
    updateStorageInfo();
  });

  // XMLファイルとしてダウンロード
  var blob = new Blob([currentProject.xml], { type: 'application/xml' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = currentProject.name + '.xml';
  a.click();
  URL.revokeObjectURL(url);

  toast('プロジェクトを保存しました');
}

// ワークスペース
function undo()      {
  if (window.blocklyWorkspace) {
    window.blocklyWorkspace.undo(false);
  }
}
function redo()      {
  if (window.blocklyWorkspace) {
    window.blocklyWorkspace.undo(true);
  }
}
function zoomIn()    {
  if (window.blocklyWorkspace) {
    window.blocklyWorkspace.zoomCenter(1);
  }
}
function zoomOut()   {
  if (window.blocklyWorkspace) {
    window.blocklyWorkspace.zoomCenter(-1);
  }
}
function resetView() {
  if (window.blocklyWorkspace) {
    window.blocklyWorkspace.setScale(1);
    window.blocklyWorkspace.scrollCenter();
  }
}
function runCode() {
  if (!window.blocklyWorkspace) return;

  var code = generateCode();
  if (!code.trim()) {
    toast('実行するコードがありません');
    return;
  }

  // 実行開始時にグラフを完全リセット（古いラベルのチャートを除去）
  resetChart();

  if (NestSerial.isConnected()) {
    logToConsole('実行開始', 'ok');
    NestSerial.executeCode(code).catch(function (err) {
      logToConsole('実行エラー: ' + err.message, 'err');
    });
  } else {
    // 未接続時はプレビュー表示
    logToConsole('実行開始 (プレビュー — Pico 未接続)', 'warn');
    var lines = code.split('\n');
    for (var i = 0; i < lines.length; i++) {
      logToConsole(lines[i], '');
    }
  }
}

function stopExec() {
  if (NestSerial.isConnected()) {
    NestSerial.stopExecution().then(function () {
      logToConsole('停止しました', 'warn');
    }).catch(function (err) {
      logToConsole('停止エラー: ' + err.message, 'err');
    });
  } else {
    toast('Pico が接続されていません');
  }
}

// コード
function copyCode()     {
  if (window.blocklyWorkspace) {
    var code = generateCode();
    navigator.clipboard.writeText(code).then(function() {
      toast('コードをコピーしました');
    });
  }
}
function downloadCode() {
  if (window.blocklyWorkspace) {
    var code = generateCode();
    var blob = new Blob([code], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
    a.click();
    URL.revokeObjectURL(url);
    toast('コードをダウンロードしました');
  }
}

// シリアル接続
function toggleConnection() {
  if (NestSerial.isConnected()) {
    NestSerial.disconnect().then(function () {
      updateConnectionUI(false);
      logToConsole('切断しました', 'ok');
    }).catch(function (err) {
      logToConsole('切断エラー: ' + err.message, 'err');
    });
  } else {
    openConnectModal();
  }
}

// ── 接続モーダル ──
function openConnectModal() {
  cmGoStep(1);
  document.getElementById('cmOverlay').classList.add('show');
}

function closeConnectModal() {
  document.getElementById('cmOverlay').classList.remove('show');
}

function cmGoStep(n) {
  [1, 2, 3].forEach(function(i) {
    document.getElementById('cmP' + i).classList.remove('active');
    var s = document.getElementById('cmS' + i);
    s.className = i < n ? 'cm-step-circle done' : i === n ? 'cm-step-circle active' : 'cm-step-circle';
    if (i < 3) document.getElementById('cmL' + i).className = i < n ? 'cm-step-line done' : 'cm-step-line';
  });
  var panel = document.getElementById('cmP' + n);
  panel.classList.remove('active');
  void panel.offsetWidth; // reflow でアニメーション再トリガー
  panel.classList.add('active');
}

function cmDoConnect() {
  var baudRate = parseInt(localStorage.getItem('nb-baudrate') || '115200', 10);
  NestSerial.connect(baudRate).then(function () {
    updateConnectionUI(true);
    logToConsole('Pico に接続しました (ボーレート: ' + baudRate + ')', 'ok');
    cmGoStep(3);
  }).catch(function (err) {
    if (err.name === 'NotFoundError') return; // ユーザーがポート選択をキャンセル
    logToConsole('接続エラー: ' + err.message, 'err');
    toast('接続に失敗しました');
  });
}

// ── 書き込みモーダル ──
var wmTimers = [];

function openWriteModal() {
  var wmFill   = document.getElementById('wmFill');
  var wmPct    = document.getElementById('wmPct');
  var wmDot    = document.getElementById('wmDot');
  var wmStatus = document.getElementById('wmStatus');
  var wmDone   = document.getElementById('wmDone');
  var wmCancel = document.getElementById('wmCancel');
  var wmClose  = document.getElementById('wmClose');
  var wmBytes  = document.getElementById('wmBytes');
  var wmRate   = document.getElementById('wmRate');
  var wmTitle  = document.getElementById('wmTitle');
  var wmBoard  = document.getElementById('wmBoard');

  // ボード名を設定（プロジェクト作成時に選択したボード）
  var boardNames = { pico: 'Raspberry Pi Pico', esp32: 'ESP32' };
  var boardName = (currentProject && boardNames[currentProject.boardType]) || 'Raspberry Pi Pico';
  wmBoard.textContent = boardName;

  // 初期化
  wmFill.style.width = '0%';
  wmFill.classList.add('active');
  wmPct.textContent = '0%';
  wmDot.className = 'wm-status-dot';
  wmStatus.className = 'wm-status-text';
  wmStatus.textContent = '接続を確認中…';
  wmDone.classList.remove('show');
  wmCancel.className = 'wm-cancel';
  wmClose.className = 'wm-close';
  wmBytes.textContent = '0 KB / — KB';
  wmRate.textContent = '— KB/s';
  wmTitle.textContent = '書き込み中…';

  document.getElementById('wmOverlay').classList.add('show');
}

function wmShowProgress(pct, statusText, rate, totalKB) {
  var wmFill   = document.getElementById('wmFill');
  var wmPct    = document.getElementById('wmPct');
  var wmStatus = document.getElementById('wmStatus');
  var wmBytes  = document.getElementById('wmBytes');
  var wmRate   = document.getElementById('wmRate');

  wmFill.style.width = pct + '%';
  wmPct.textContent = pct + '%';
  wmStatus.textContent = statusText;
  wmBytes.textContent = Math.round(totalKB * pct / 100) + ' KB / ' + totalKB + ' KB';
  wmRate.textContent = rate ? rate + ' KB/s' : '— KB/s';
}

function wmShowComplete() {
  var wmFill   = document.getElementById('wmFill');
  var wmDot    = document.getElementById('wmDot');
  var wmStatus = document.getElementById('wmStatus');
  var wmDone   = document.getElementById('wmDone');
  var wmCancel = document.getElementById('wmCancel');
  var wmClose  = document.getElementById('wmClose');
  var wmTitle  = document.getElementById('wmTitle');

  wmFill.style.width = '100%';
  document.getElementById('wmPct').textContent = '100%';

  setTimeout(function () {
    wmFill.classList.remove('active');
    wmDot.className = 'wm-status-dot done';
    wmStatus.className = 'wm-status-text done';
    wmStatus.textContent = '書き込みが完了しました';
    wmDone.classList.add('show');
    wmCancel.className = 'wm-cancel hidden';
    wmClose.className = 'wm-close show';
    wmTitle.textContent = '書き込み完了';
  }, 300);
}

function wmShowError(message) {
  var wmFill   = document.getElementById('wmFill');
  var wmDot    = document.getElementById('wmDot');
  var wmStatus = document.getElementById('wmStatus');
  var wmCancel = document.getElementById('wmCancel');
  var wmClose  = document.getElementById('wmClose');
  var wmTitle  = document.getElementById('wmTitle');

  wmFill.classList.remove('active');
  wmDot.className = 'wm-status-dot error';
  wmStatus.className = 'wm-status-text error';
  wmStatus.textContent = message;
  wmCancel.className = 'wm-cancel hidden';
  wmClose.className = 'wm-close show';
  wmTitle.textContent = '書き込みエラー';
}

function closeWriteModal() {
  document.getElementById('wmOverlay').classList.remove('show');
  wmTimers.forEach(clearTimeout);
  wmTimers = [];
}

function uploadCode() {
  if (!NestSerial.isConnected()) {
    toast('Pico が接続されていません');
    return;
  }
  if (!window.blocklyWorkspace) {
    toast('コードがありません');
    return;
  }

  var code = generateCode();
  if (!code.trim()) {
    toast('書き込むコードがありません');
    return;
  }

  var codeSize = new TextEncoder().encode(code).length;
  var totalKB = Math.max(1, Math.round(codeSize / 1024));

  openWriteModal();
  logToConsole('main.py に書き込み中...', 'warn');

  // 進捗を擬似的に表示しながら実際の書き込みを実行
  wmTimers.push(setTimeout(function () { wmShowProgress(10, '接続を確認中…', null, totalKB); }, 200));
  wmTimers.push(setTimeout(function () { wmShowProgress(25, 'ファームウェアを準備中…', '128', totalKB); }, 600));
  wmTimers.push(setTimeout(function () { wmShowProgress(50, 'コードを書き込み中…', '204', totalKB); }, 1200));

  NestSerial.uploadCode(code).then(function () {
    wmTimers.forEach(clearTimeout);
    wmTimers = [];
    wmShowProgress(95, 'ベリファイ中…', '240', totalKB);
    wmTimers.push(setTimeout(function () {
      wmShowComplete();
      logToConsole('書き込み完了', 'ok');
    }, 400));
  }).catch(function (err) {
    wmTimers.forEach(clearTimeout);
    wmTimers = [];
    wmShowError('エラー: ' + err.message);
    logToConsole('書き込みエラー: ' + err.message, 'err');
  });
}
function clearConsole(e)    {
  if (e) e.stopPropagation();
  document.getElementById('consoleOutput').innerHTML = '<div class="cl"><span class="ct">[--:--:--]</span><span class="cm ok">NestBlocks 準備完了</span></div>';
}

// プロジェクト管理 - リネーム
function closeRename()        { document.getElementById('renameOverlay').classList.remove('show'); }
function confirmRename()      { toast('TODO: リネーム確定'); closeRename(); }
// プロジェクトを .xml ファイルとしてダウンロード
function downloadProject() {
  if (!currentProject || !window.blocklyWorkspace) {
    toast('ダウンロードするプロジェクトがありません');
    return;
  }
  // 最新のXMLを取得
  var xml = Blockly.Xml.workspaceToDom(window.blocklyWorkspace);
  // ボード種別とプラグイン情報をXMLに埋め込む
  xml.setAttribute('data-board', currentProject.boardType || 'pico');
  var enabledPlugins = (currentProject.plugins || []).join(',');
  if (enabledPlugins) xml.setAttribute('data-plugins', enabledPlugins);
  var xmlText = Blockly.Xml.domToText(xml);

  var blob = new Blob([xmlText], { type: 'application/xml' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (currentProject.name || 'project') + '.xml';
  a.click();
  URL.revokeObjectURL(url);
  toast('「' + currentProject.name + '」をダウンロードしました');
}

// 全プロジェクトをJSONファイルとしてエクスポート
function exportProjects() {
  NestDB.getAll().then(function (projects) {
    if (!projects || projects.length === 0) {
      toast('エクスポートするプロジェクトがありません');
      return;
    }
    var json = JSON.stringify(projects, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'nestblocks-projects.json';
    a.click();
    URL.revokeObjectURL(url);
    toast(projects.length + '件のプロジェクトをエクスポートしました');
  });
}

// 設定
function resetSettings() { toast('TODO: 設定リセット'); }
function clearAllData()  { toast('TODO: 全データ削除'); }


// ──────────────────────────────
// 拡張機能（プラグイン）
// ──────────────────────────────
function showPluginModal() {
  renderPluginList();
  document.getElementById('pluginOverlay').classList.add('show');
}

function closePluginModal() {
  document.getElementById('pluginOverlay').classList.remove('show');
}

// ──────────────────────────────
// PicoNest デバイスモーダル
// ──────────────────────────────
function openPicoNestModal() {
  document.getElementById('picoNestOverlay').classList.add('show');
}

function closePicoNestModal() {
  document.getElementById('picoNestOverlay').classList.remove('show');
}

// ──────────────────────────────
// RoboPad モーダル
// ──────────────────────────────
function openRoboPadModal() {
  document.getElementById('roboPadOverlay').classList.add('show');
}

function closeRoboPadModal() {
  document.getElementById('roboPadOverlay').classList.remove('show');
}

// ──────────────────────────────
// 更新履歴
// 新しいバージョンは配列の先頭に追加してください。
//   tag: 'new'（新機能）/ 'fix'（修正）/ 'improve'（改善）
// ──────────────────────────────
var CHANGELOG = [
  {
    version: 'v1.2.0',
    date: '2026-06-22',
    items: [
      { tag: 'new', text: '絶対値（abs）ブロックを追加しました。' },
      { tag: 'new', text: '範囲変換（map）ブロックを追加しました。値を別の範囲に変換できます。' },
      { tag: 'improve', text: '数学ブロックのラベルを、はじめての人にも分かりやすい文章に変更しました。' },
      { tag: 'new', text: '対応デバイス「PicoNest」の詳細モーダル（写真・機能説明）を追加しました。' },
      { tag: 'new', text: 'ホーム画面から公式ドキュメントを開けるようにしました。' },
    ]
  },
  {
    version: 'v1.1.0',
    date: '2026-06-14',
    items: [
      { tag: 'new', text: 'GamePad コントローラーに対応しました（BLE 接続でワイヤレス操作）。' },
      { tag: 'new', text: 'コントローラー用のブロックを追加しました。' },
      { tag: 'fix', text: '各種の不具合を修正しました。' },
    ]
  },
  {
    version: 'v1.0.0',
    date: '2026-04-19',
    items: [
      { tag: 'new', text: 'NestBlocks を公開しました。' },
      { tag: 'new', text: 'ブロックエディタと MicroPython コードの自動生成に対応。' },
      { tag: 'new', text: 'USB（WebSerial）でマイコンへ直接書き込めるようにしました。' },
      { tag: 'new', text: 'リアルタイムグラフ・拡張機能・多言語表示に対応しました。' },
    ]
  },
];

var CHANGELOG_TAGS = {
  'new':     { label: '新機能', cls: 'cl-tag--new' },
  'fix':     { label: '修正',   cls: 'cl-tag--fix' },
  'improve': { label: '改善',   cls: 'cl-tag--improve' },
};

function renderChangelog() {
  var list = document.getElementById('changelogList');
  if (!list) return;
  var html = '';
  for (var i = 0; i < CHANGELOG.length; i++) {
    var rel = CHANGELOG[i];
    html += '<div class="cl-release">';
    html += '<div class="cl-release-head">';
    html += '<span class="cl-version">' + rel.version + '</span>';
    if (i === 0) html += '<span class="cl-latest">最新</span>';
    html += '<span class="cl-date">' + rel.date + '</span>';
    html += '</div>';
    html += '<ul class="cl-items">';
    for (var j = 0; j < rel.items.length; j++) {
      var item = rel.items[j];
      var t = CHANGELOG_TAGS[item.tag] || { label: '', cls: '' };
      html += '<li><span class="cl-tag ' + t.cls + '">' + t.label + '</span>'
            + '<span class="cl-text">' + item.text + '</span></li>';
    }
    html += '</ul>';
    html += '</div>';
  }
  list.innerHTML = html;

  // フッターのバージョン表記を最新に同期
  var fv = document.getElementById('footerVersion');
  if (fv && CHANGELOG.length) fv.textContent = CHANGELOG[0].version;
}

function openChangelogModal() {
  renderChangelog();
  document.getElementById('changelogOverlay').classList.add('show');
}

function closeChangelogModal() {
  document.getElementById('changelogOverlay').classList.remove('show');
}

function renderPluginList() {
  var list = document.getElementById('pluginList');
  if (!list) return;

  var plugins = NestPlugins.getAll();
  list.innerHTML = '';

  if (plugins.length === 0) {
    list.innerHTML = '<div class="ext-empty">利用可能な拡張機能はありません</div>';
    return;
  }

  for (var i = 0; i < plugins.length; i++) {
    (function (plugin) {
      var enabled = NestPlugins.isEnabled(plugin.id);

      var card = document.createElement('div');
      card.className = 'ext-card' + (enabled ? ' enabled' : '');

      // サムネイル
      var thumbStyle = 'background:' + (plugin.color || '#888') + '18';
      var thumbContent = plugin.icon || '🧩';
      if (plugin.thumbSvg) {
        thumbStyle = '';
        thumbContent = plugin.thumbSvg;
      } else if (plugin.thumb) {
        thumbStyle = 'background:url(' + plugin.thumb + ') center/cover no-repeat';
        thumbContent = '';
      }

      card.innerHTML =
        '<div class="ext-card-thumb" style="' + thumbStyle + '">' +
        thumbContent +
        '<div class="ext-card-badge"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>' +
        '</div>' +
        '<div class="ext-card-info">' +
        '<div class="ext-card-name">' + escapeHtml(plugin.name) + '</div>' +
        '<div class="ext-card-desc">' + escapeHtml(plugin.description || '') + '</div>' +
        '</div>';

      card.addEventListener('click', function () {
        if (NestPlugins.isEnabled(plugin.id)) {
          NestPlugins.disable(plugin.id);
          card.classList.remove('enabled');
          toast('「' + plugin.name + '」を無効にしました');
        } else {
          NestPlugins.enable(plugin.id);
          closePluginModal();
          toast('「' + plugin.name + '」を追加しました');
        }
      });

      list.appendChild(card);
    })(plugins[i]);
  }
}


// ──────────────────────────────
// 印刷
// ──────────────────────────────
function showPrintModal() {
  if (!currentProject || !window.blocklyWorkspace) {
    toast('印刷するプロジェクトがありません');
    return;
  }
  if (window.blocklyWorkspace.getAllBlocks(false).length === 0) {
    toast('ブロックがありません');
    return;
  }
  document.getElementById('printOverlay').classList.add('show');
}

function closePrintModal() {
  document.getElementById('printOverlay').classList.remove('show');
}

function doPrint() {
  closePrintModal();

  var includeCode = document.getElementById('printIncludeCode').checked;
  var ws = window.blocklyWorkspace;

  // ── blocklyBlockCanvas の実際の描画範囲から viewBox を計算 ──
  var svgEl = ws.getParentSvg();
  var blockCanvas = svgEl.querySelector('.blocklyBlockCanvas');
  if (!blockCanvas) {
    toast('ブロックがありません');
    return;
  }

  // blocklyBlockCanvas の getBBox() はグループのローカル座標
  var localBBox = blockCanvas.getBBox();
  if (localBBox.width < 1) {
    toast('ブロックがありません');
    return;
  }

  // blocklyBlockCanvas の変換行列（translate + scale）を取得
  var ctm = blockCanvas.getScreenCTM();
  var svgCtm = svgEl.getScreenCTM();
  // SVG 座標系での相対変換行列を計算
  var rel = svgCtm.inverse().multiply(ctm);

  // ローカル座標 → SVG 座標に変換
  var padding = 15;
  var vbX = rel.a * localBBox.x + rel.e - padding;
  var vbY = rel.d * localBBox.y + rel.f - padding;
  var vbW = rel.a * localBBox.width + padding * 2;
  var vbH = rel.d * localBBox.height + padding * 2;

  // SVG をクローンして不要な要素を除去
  var svgClone = svgEl.cloneNode(true);
  ['.blocklyToolboxDiv', '.blocklyFlyout', '.blocklyTrash',
   '.blocklyScrollbarHorizontal', '.blocklyScrollbarVertical',
   '.blocklyBubbleCanvas', '.blocklyZoom', '.blocklyCursorSvg',
   '.blocklyMainBackground'
  ].forEach(function (sel) {
    var els = svgClone.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) els[i].remove();
  });

  // テキストフィールドの背景矩形が黒塗りになるのを防止
  // SVGシリアライズ時にCSSが失われるため、fill属性を明示的に設定
  var editRects = svgClone.querySelectorAll('.blocklyEditableText rect, .blocklyNonEditableText rect');
  for (var er = 0; er < editRects.length; er++) {
    var r = editRects[er];
    if (!r.getAttribute('fill') || r.getAttribute('fill') === 'none') {
      r.setAttribute('fill', 'white');
      r.setAttribute('fill-opacity', '0.6');
    }
  }

  svgClone.setAttribute('viewBox', vbX + ' ' + vbY + ' ' + vbW + ' ' + vbH);
  svgClone.setAttribute('width', vbW);
  svgClone.setAttribute('height', vbH);

  // SVG → PNG（Canvas 経由）
  var svgData = new XMLSerializer().serializeToString(svgClone);
  var blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  var url = URL.createObjectURL(blob);

  var img = new Image();
  img.onload = function () {
    // A4印刷幅に合わせてスケール（CSS px 基準で約 650px）
    var PAGE_W = 650;
    var scale = PAGE_W / vbW;
    var cssW = PAGE_W;
    var cssH = Math.round(vbH * scale);

    // 高解像度 Canvas（2x）
    var canvas = document.createElement('canvas');
    canvas.width = cssW * 2;
    canvas.height = cssH * 2;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    var dataUrl = canvas.toDataURL('image/png');

    // 印刷データ準備
    var boardLabel = currentProject.boardType === 'nestcore' ? 'PicoNest' : 'Raspberry Pi Pico';
    var blockCount = ws.getAllBlocks(false).length;
    var now = new Date();
    var printDate = now.getFullYear() + '/' +
      ('0' + (now.getMonth() + 1)).slice(-2) + '/' +
      ('0' + now.getDate()).slice(-2) + ' ' +
      ('0' + now.getHours()).slice(-2) + ':' +
      ('0' + now.getMinutes()).slice(-2);

    function formatDate(iso) {
      if (!iso) return '-';
      var d = new Date(iso);
      return d.getFullYear() + '/' +
        ('0' + (d.getMonth() + 1)).slice(-2) + '/' +
        ('0' + d.getDate()).slice(-2) + ' ' +
        ('0' + d.getHours()).slice(-2) + ':' +
        ('0' + d.getMinutes()).slice(-2);
    }

    var codeHtml = '';
    if (includeCode) {
      var code = generateCode();
      codeHtml =
        '<div style="margin-top:24px">' +
        '<div class="section-label">Python Code</div>' +
        '<pre class="code">' + escapeHtml(code) + '</pre></div>';
    }

    // ── 表紙 + ブロック + コードの HTML を組み立て ──
    var logoSvg =
      '<svg width="54" height="54" viewBox="0 0 54 54" fill="none">' +
      '<rect x="0" y="0" width="14" height="38" rx="3.5" fill="#111"/>' +
      '<rect x="0" y="28" width="30" height="14" rx="3.5" fill="#111"/>' +
      '<rect x="24" y="16" width="14" height="38" rx="3.5" fill="#D94510"/>' +
      '<rect x="24" y="16" width="30" height="14" rx="3.5" fill="#D94510"/>' +
      '</svg>';

    var coverHtml =
      '<div class="cover">' +
      '  <div class="cover-top">' +
      '    <div class="cover-logo">' + logoSvg + '</div>' +
      '    <div class="cover-brand">Nest<span>Blocks</span></div>' +
      '  </div>' +
      '  <div class="cover-center">' +
      '    <div class="cover-name">' + escapeHtml(currentProject.name) + '</div>' +
      '  </div>' +
      '  <div class="cover-info">' +
      '    <table class="info-table">' +
      '      <tr><td class="info-label">Board</td><td class="info-value">' + boardLabel + '</td></tr>' +
      '      <tr><td class="info-label">Blocks</td><td class="info-value">' + blockCount + '</td></tr>' +
      '      <tr><td class="info-label">Created</td><td class="info-value">' + formatDate(currentProject.createdAt) + '</td></tr>' +
      '      <tr><td class="info-label">Updated</td><td class="info-value">' + formatDate(currentProject.updatedAt) + '</td></tr>' +
      '    </table>' +
      '  </div>' +
      '  <div class="cover-footer">' +
      '    <span class="cover-ver">NestBlocks Beta</span>' +
      '    <span class="cover-date">' + printDate + '</span>' +
      '  </div>' +
      '</div>';

    // 隠し iframe に印刷用HTMLを書き込んで印刷
    var frame = document.getElementById('printFrame');
    var doc = frame.contentDocument || frame.contentWindow.document;

    doc.open();
    doc.write(
      '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<title>' + escapeHtml(currentProject.name) + ' — NestBlocks</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">' +
      '<style>' +
      '*{margin:0;padding:0;box-sizing:border-box}' +
      'body{font-family:system-ui,sans-serif;color:#111}' +

      /* 表紙 */
      '.cover{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;page-break-after:always;padding:40px}' +
      '.cover-top{margin-bottom:48px}' +
      '.cover-logo{margin-bottom:12px}' +
      '.cover-brand{font-family:Outfit,sans-serif;font-size:16pt;font-weight:800;letter-spacing:-.03em;color:#888}' +
      '.cover-brand span{color:#D94510}' +
      '.cover-center{margin-bottom:48px}' +
      '.cover-name{font-family:Outfit,sans-serif;font-size:32pt;font-weight:900;letter-spacing:-.04em;line-height:1.2;color:#111}' +
      '.cover-info{margin-bottom:auto}' +
      '.info-table{border-collapse:collapse;text-align:left;margin:0 auto}' +
      '.info-label{font-family:JetBrains Mono,monospace;font-size:9pt;font-weight:500;color:#999;padding:5px 20px 5px 0;text-transform:uppercase;letter-spacing:.06em}' +
      '.info-value{font-family:JetBrains Mono,monospace;font-size:10pt;font-weight:500;color:#333;padding:5px 0}' +
      '.cover-footer{margin-top:auto;padding-top:40px;display:flex;flex-direction:column;gap:4px}' +
      '.cover-ver{font-family:Outfit,sans-serif;font-size:10pt;font-weight:700;color:#ccc}' +
      '.cover-date{font-family:JetBrains Mono,monospace;font-size:8pt;color:#ccc}' +

      /* ブロック・コード */
      '.content{padding:20px}' +
      '.blocks img{width:100%;height:auto;display:block}' +
      '.section-label{font-family:Outfit,sans-serif;font-size:11pt;font-weight:800;color:#666;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}' +
      '.code{font-family:JetBrains Mono,monospace;font-size:9pt;line-height:1.7;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:12px 16px;white-space:pre-wrap;word-break:break-all;color:#111}' +

      '@media print{@page{margin:15mm}.cover{height:100vh}.content{padding:0}}' +
      '</style></head><body>' +
      coverHtml +
      '<div class="content">' +
      '<div class="blocks"><img src="' + dataUrl + '"></div>' +
      codeHtml +
      '</div>' +
      '</body></html>'
    );
    doc.close();

    // フォントと画像の読み込みを待ってから iframe 内で印刷
    setTimeout(function () {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }, 800);
  };

  img.onerror = function () {
    URL.revokeObjectURL(url);
    toast('ブロックの画像化に失敗しました');
  };
  img.src = url;
}


// ──────────────────────────────
// コンソール・接続 UI ヘルパー
// ──────────────────────────────

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// コンソール出力バッファ（DOM更新を間引いてブラウザ負荷を軽減）
var _consoleBuf = [];
var _consoleTimer = null;
var _CONSOLE_MAX_LINES = 200;
var _CONSOLE_FLUSH_MS = 50;      // 50ms間隔 = 最大20回/秒

function _flushConsole() {
  _consoleTimer = null;
  if (_consoleBuf.length === 0) return;

  var consoleOutput = document.getElementById('consoleOutput');
  var html = '';
  for (var i = 0; i < _consoleBuf.length; i++) {
    html += _consoleBuf[i];
  }
  _consoleBuf = [];

  // innerHTML+= ではなく insertAdjacentHTML で新規分だけパース（高速）
  consoleOutput.insertAdjacentHTML('beforeend', html);

  // 行数上限を超えたら古い行を削除
  var overflow = consoleOutput.children.length - _CONSOLE_MAX_LINES;
  if (overflow > 0) {
    for (var r = 0; r < overflow; r++) {
      consoleOutput.removeChild(consoleOutput.firstChild);
    }
  }

  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function logToConsole(msg, cls) {
  var time = new Date().toLocaleTimeString('ja-JP');
  var classAttr = cls ? ' ' + cls : '';
  _consoleBuf.push(
    '<div class="cl"><span class="ct">[' + time + ']</span>' +
    '<span class="cm' + classAttr + '">' + escapeHtml(msg) + '</span></div>'
  );

  if (!_consoleTimer) {
    _consoleTimer = setTimeout(_flushConsole, _CONSOLE_FLUSH_MS);
  }
}

function updateConnectionUI(connected) {
  var btn = document.getElementById('connectBtn');
  var label = document.getElementById('connectLabel');
  if (connected) {
    btn.classList.add('connected');
    label.textContent = '接続済み';
  } else {
    btn.classList.remove('connected');
    label.textContent = '未接続';
  }
}


// ──────────────────────────────
// リアルタイムグラフ（Chart.js）
// ──────────────────────────────

var _chartPaused = false;
var _CHART_MAX_POINTS = 100;
var _CHART_COLORS = [
  '#D94510', '#5BA0E0', '#5DC06C', '#F06030',
  '#8B6FE8', '#E05A5A', '#E87070', '#4A90D9'
];
var _chartDirty = false;       // データ変更フラグ
var _chartRAF = null;          // requestAnimationFrame ID
var _chartInstances = {};      // ラベル → { chart, panel }
var _chartColorCounter = 0;
var _chartNeedsUpdate = false; // タブ非表示中にデータ変更があったか

// グラフタブが表示中かどうか
function isChartTabVisible() {
  var el = document.getElementById('chart');
  return el && el.classList.contains('active');
}

// ラベル用の個別 Chart.js インスタンスを作成
function createChartForLabel(label) {
  var container = document.getElementById('chartPanels');
  if (!container) return null;

  var colorIndex = _chartColorCounter % _CHART_COLORS.length;
  _chartColorCounter++;
  var color = _CHART_COLORS[colorIndex];

  // パネル要素を作成
  var panel = document.createElement('div');
  panel.className = 'chart-panel';

  var head = document.createElement('div');
  head.className = 'chart-panel-head';

  var dot = document.createElement('span');
  dot.className = 'chart-panel-dot';
  dot.style.background = color;

  var title = document.createElement('span');
  title.textContent = label;

  head.appendChild(dot);
  head.appendChild(title);

  var canvasWrap = document.createElement('div');
  canvasWrap.className = 'chart-panel-canvas';

  var canvas = document.createElement('canvas');
  canvasWrap.appendChild(canvas);

  panel.appendChild(head);
  panel.appendChild(canvasWrap);
  container.appendChild(panel);

  var chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: label,
        data: [],
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
        spanGaps: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { intersect: false, mode: 'index' },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8, font: { family: "'JetBrains Mono', monospace", size: 10 } }
        },
        y: {
          ticks: { font: { family: "'JetBrains Mono', monospace", size: 10 } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  _chartInstances[label] = { chart: chart, panel: panel };
  return _chartInstances[label];
}

// 描画をスケジュール（requestAnimationFrame でバッチ更新）
function scheduleChartUpdate() {
  if (_chartRAF) return;
  _chartRAF = requestAnimationFrame(function () {
    _chartRAF = null;
    if (!_chartDirty) return;
    _chartDirty = false;

    // タブが非表示の場合は描画を延期（Canvas サイズ0で壊れるのを防止）
    if (!isChartTabVisible()) {
      _chartNeedsUpdate = true;
      return;
    }

    var keys = Object.keys(_chartInstances);
    for (var i = 0; i < keys.length; i++) {
      _chartInstances[keys[i]].chart.update('none');
    }
  });
}

// グラフにデータポイントを追加
function addChartData(label, value) {
  if (_chartPaused) return;

  // 空状態を非表示にしてパネルを表示
  var emptyEl = document.getElementById('chartEmpty');
  var panelsEl = document.getElementById('chartPanels');
  if (emptyEl) emptyEl.style.display = 'none';
  if (panelsEl) panelsEl.style.display = '';

  // ラベルに対応するチャートを取得（なければ作成）
  var entry = _chartInstances[label];
  if (!entry) {
    entry = createChartForLabel(label);
  }
  if (!entry) return;

  var chart = entry.chart;

  // 時刻ラベル（ミリ秒付き）
  var now = new Date();
  var timeStr = ('0' + now.getHours()).slice(-2) + ':' +
                ('0' + now.getMinutes()).slice(-2) + ':' +
                ('0' + now.getSeconds()).slice(-2) + '.' +
                ('00' + now.getMilliseconds()).slice(-3);

  chart.data.labels.push(timeStr);
  chart.data.datasets[0].data.push(value);

  // 最大ポイント数を超えたら古いデータを削除
  if (chart.data.labels.length > _CHART_MAX_POINTS) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  _chartDirty = true;
  scheduleChartUpdate();
}

// グラフをクリア（データのみリセット、インスタンスは保持）
function clearChart() {
  if (_chartRAF) {
    cancelAnimationFrame(_chartRAF);
    _chartRAF = null;
  }
  _chartDirty = false;
  _chartNeedsUpdate = false;

  var keys = Object.keys(_chartInstances);
  for (var i = 0; i < keys.length; i++) {
    var chart = _chartInstances[keys[i]].chart;
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update('none');
  }
}

// グラフを完全リセット（全インスタンスを破棄して初期状態に戻す）
function resetChart() {
  if (_chartRAF) {
    cancelAnimationFrame(_chartRAF);
    _chartRAF = null;
  }
  _chartDirty = false;
  _chartNeedsUpdate = false;

  // 全チャートインスタンスを破棄
  var keys = Object.keys(_chartInstances);
  for (var i = 0; i < keys.length; i++) {
    _chartInstances[keys[i]].chart.destroy();
  }
  _chartInstances = {};
  _chartColorCounter = 0;

  // パネルをクリアして空状態に戻す
  var panelsEl = document.getElementById('chartPanels');
  if (panelsEl) {
    panelsEl.innerHTML = '';
    panelsEl.style.display = 'none';
  }
  var emptyEl = document.getElementById('chartEmpty');
  if (emptyEl) emptyEl.style.display = '';
}

// グラフの一時停止/再開
function toggleChartPause() {
  _chartPaused = !_chartPaused;
  var btn = document.getElementById('chartPauseBtn');
  if (btn) {
    btn.textContent = _chartPaused ? '再開' : '一時停止';
  }

  // 再開時: 各チャートに null を挿入して線を切断（一時停止前後のデータを繋がない）
  if (!_chartPaused) {
    var keys = Object.keys(_chartInstances);
    for (var i = 0; i < keys.length; i++) {
      var chart = _chartInstances[keys[i]].chart;
      chart.data.labels.push('');
      chart.data.datasets[0].data.push(null);
    }
  }
}


// ──────────────────────────────
// 設定の管理
// ──────────────────────────────

// 設定の読み込み
function loadSettings() {
  var sound = localStorage.getItem('nb-sound') || 'off';
  var baudRate = localStorage.getItem('nb-baudrate') || '115200';

  var soundSelect = document.getElementById('soundSelect');
  var baudRateSelect = document.getElementById('baudRate');

  if (soundSelect) soundSelect.value = sound;
  if (baudRateSelect) baudRateSelect.value = baudRate;

  return { sound: sound, baudRate: baudRate };
}

// サウンド設定の変更
function changeSoundSetting(value) {
  localStorage.setItem('nb-sound', value);

  if (window.blocklyWorkspace) {
    // Blocklyのサウンド設定を反映
    window.blocklyWorkspace.options.hasSounds = (value === 'on');
  }

  toast('サウンド設定を' + (value === 'on' ? 'ON' : 'OFF') + 'にしました');
}

// ボーレート設定の変更
function changeBaudRate(value) {
  localStorage.setItem('nb-baudrate', value);
  toast('ボーレートを' + value + 'に変更しました');
}

// 設定項目のイベントリスナーを設定（DOMが読み込まれた後に実行）
document.addEventListener('DOMContentLoaded', function() {
  // コードエディタの行番号スクロール同期
  var codeContent = document.getElementById('codeContent');
  var lineNumbers = document.getElementById('lineNumbers');
  if (codeContent && lineNumbers) {
    codeContent.addEventListener('scroll', function() {
      lineNumbers.scrollTop = codeContent.scrollTop;
    });
  }

  // 設定を読み込み
  loadSettings();

  // IndexedDB を初期化（localStorage マイグレーション含む）してからグリッド表示
  NestDB.init().then(function () {
    renderProjectGrid();
    updateStorageInfo();
  });

  // イベントリスナーを設定
  var soundSelect = document.getElementById('soundSelect');
  var baudRateSelect = document.getElementById('baudRate');

  if (soundSelect) {
    soundSelect.addEventListener('change', function(e) {
      changeSoundSetting(e.target.value);
    });
  }

  if (baudRateSelect) {
    baudRateSelect.addEventListener('change', function(e) {
      changeBaudRate(e.target.value);
    });
  }

  // NestSerial コールバック登録
  NestSerial.setOnData(function (line) {
    // グラフデータを検出: __GRAPH__:ラベル:値
    var graphMatch = line.match(/^__GRAPH__:(.+?):(.+)$/);
    if (graphMatch) {
      addChartData(graphMatch[1], parseFloat(graphMatch[2]));
      return; // コンソールには表示しない
    }
    logToConsole(line, '');
  });

  NestSerial.setOnDisconnect(function () {
    updateConnectionUI(false);
    logToConsole('Pico が切断されました', 'warn');
    toast('Pico が切断されました');
  });

  // 新規作成モーダルのイベントリスナー
  var newProjectInput = document.getElementById('newProjectInput');
  var newProjectOverlay = document.getElementById('newProjectOverlay');

  if (newProjectInput) {
    newProjectInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        createNewProject();
      } else if (e.key === 'Escape') {
        closeNewProject();
      }
    });
  }

  if (newProjectOverlay) {
    newProjectOverlay.addEventListener('click', function(e) {
      if (e.target === newProjectOverlay) {
        closeNewProject();
      }
    });
  }

  // 接続モーダル：オーバーレイクリックで閉じる
  var cmOverlay = document.getElementById('cmOverlay');
  if (cmOverlay) {
    cmOverlay.addEventListener('click', function(e) {
      if (e.target === cmOverlay) closeConnectModal();
    });
  }

  // 拡張機能モーダル：オーバーレイクリックで閉じる
  var pluginOverlay = document.getElementById('pluginOverlay');
  if (pluginOverlay) {
    pluginOverlay.addEventListener('click', function(e) {
      if (e.target === pluginOverlay) closePluginModal();
    });
  }

  // PicoNest モーダル：オーバーレイクリックで閉じる
  var picoNestOverlay = document.getElementById('picoNestOverlay');
  if (picoNestOverlay) {
    picoNestOverlay.addEventListener('click', function(e) {
      if (e.target === picoNestOverlay) closePicoNestModal();
    });
  }

  // RoboPad モーダル：オーバーレイクリックで閉じる
  var roboPadOverlay = document.getElementById('roboPadOverlay');
  if (roboPadOverlay) {
    roboPadOverlay.addEventListener('click', function(e) {
      if (e.target === roboPadOverlay) closeRoboPadModal();
    });
  }

  // 更新履歴モーダル：オーバーレイクリックで閉じる
  var changelogOverlay = document.getElementById('changelogOverlay');
  if (changelogOverlay) {
    changelogOverlay.addEventListener('click', function(e) {
      if (e.target === changelogOverlay) closeChangelogModal();
    });
  }

  // 印刷モーダル：オーバーレイクリックで閉じる
  var printOverlay = document.getElementById('printOverlay');
  if (printOverlay) {
    printOverlay.addEventListener('click', function(e) {
      if (e.target === printOverlay) closePrintModal();
    });
  }

  // 書き込みモーダル：完了後のみオーバーレイクリックで閉じる
  var wmOverlay = document.getElementById('wmOverlay');
  if (wmOverlay) {
    wmOverlay.addEventListener('click', function(e) {
      var wmClose = document.getElementById('wmClose');
      if (e.target === wmOverlay && wmClose && wmClose.classList.contains('show')) {
        closeWriteModal();
      }
    });
  }

  // ── ヘルプモーダルのオーバーレイクリック ──
  var helpOverlay = document.getElementById('helpOverlay');
  if (helpOverlay) {
    helpOverlay.addEventListener('click', function(e) {
      if (e.target === helpOverlay) NestHelp.close();
    });
  }

  // ── ドキュメントリンクを設定 ──
  var docsLink = document.getElementById('docsLink');
  if (docsLink) docsLink.href = DOCS_URL;

  // ── 言語セレクターの値を復元 ──
  var langSelect = document.getElementById('langSelect');
  if (langSelect && typeof NestI18n !== 'undefined') {
    langSelect.value = NestI18n.getLang();
  }

  // ── i18n をDOMに適用 ──
  if (typeof NestI18n !== 'undefined') {
    NestI18n.applyToDOM();
  }

  // ── JSONインポート ──
  var importFile = document.getElementById('importFile');
  if (importFile) {
    importFile.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var projects = JSON.parse(ev.target.result);
          if (!Array.isArray(projects)) { toast('無効なファイル形式です'); return; }
          var count = 0;
          function saveNext() {
            if (count >= projects.length) {
              toast(count + '件のプロジェクトをインポートしました');
              renderProjectGrid();
              updateStorageInfo();
              return;
            }
            var p = projects[count];
            delete p.id; // 新規IDで保存
            p.updatedAt = new Date().toISOString();
            NestDB.save(p).then(function () { count++; saveNext(); });
          }
          saveNext();
        } catch (err) {
          toast('ファイルの読み込みに失敗しました');
        }
      };
      reader.readAsText(file);
      importFile.value = ''; // 同じファイルを再選択可能にする
    });
  }

});


// ──────────────────────────────
// v2: スクロール連動アニメーション (IntersectionObserver)
// ──────────────────────────────
(function () {
  if (!('IntersectionObserver' in window)) {
    // フォールバック: 全部表示
    document.querySelectorAll('.lp-reveal').forEach(function (el) {
      el.classList.add('visible');
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -60px 0px'
  });

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.lp-reveal').forEach(function (el) {
      observer.observe(el);
    });
  });
})();



// ──────────────────────────────
// エラーメッセージのユーザーフレンドリー化
// ──────────────────────────────
function friendlyError(errType, originalMsg) {
  if (typeof NestI18n === 'undefined') return originalMsg;
  var t = NestI18n.t;

  switch (errType) {
    case 'no_serial':
      return t('err.noSerial');
    case 'pico_not_found':
      return t('err.picoNotFound');
    case 'upload_fail':
      return t('err.uploadFail');
    case 'connection_lost':
      return t('err.connectionLost');
    case 'no_code':
      return t('err.noCode');
    case 'save_fail':
      return t('err.saveFail');
    default:
      return originalMsg;
  }
}
