// ──────────────────────────────
// NestPlugins — プラグイン管理
// ──────────────────────────────
var NestPlugins = (function () {

  var STORAGE_KEY = 'nb-plugins-enabled';
  var registry = {};     // id → plugin定義
  var initialized = {};  // id → true (ブロック/生成定義済み)

  // ── 有効なプラグインIDリストを取得 ──
  function getEnabled() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function setEnabled(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  // ── プラグイン登録（各プラグインJSファイルから呼ばれる）──
  function register(plugin) {
    if (!plugin.id) return;
    registry[plugin.id] = plugin;
  }

  // ── プラグインのブロック定義を初期化 ──
  function initPlugin(id) {
    var plugin = registry[id];
    if (!plugin || initialized[id]) return;
    if (plugin.initBlocks) plugin.initBlocks();
    if (plugin.initGenerators) plugin.initGenerators();
    initialized[id] = true;
  }

  // ── プラグインを有効化 ──
  function enable(id) {
    var enabled = getEnabled();
    if (enabled.indexOf(id) === -1) {
      enabled.push(id);
      setEnabled(enabled);
    }
    initPlugin(id);
    refreshToolbox();
  }

  // ── プラグインを無効化 ──
  function disable(id) {
    var enabled = getEnabled();
    enabled = enabled.filter(function (e) { return e !== id; });
    setEnabled(enabled);
    refreshToolbox();
  }

  // ── プラグインが有効かどうか ──
  function isEnabled(id) {
    return getEnabled().indexOf(id) !== -1;
  }

  // ── 有効なプラグインのツールボックスカテゴリを取得 ──
  function getEnabledToolboxCategories(boardType) {
    var enabled = getEnabled();
    var cats = [];
    for (var i = 0; i < enabled.length; i++) {
      var plugin = registry[enabled[i]];
      if (!plugin || !plugin.toolbox) continue;
      // ボード対応チェック
      if (plugin.boards && plugin.boards.indexOf(boardType) === -1) continue;
      // ブロック定義がまだなら初期化
      initPlugin(enabled[i]);
      // toolbox が配列（複数カテゴリ）か単一カテゴリかを判定
      if (Array.isArray(plugin.toolbox)) {
        cats = cats.concat(plugin.toolbox);
      } else {
        cats.push(plugin.toolbox);
      }
    }
    return cats;
  }

  // ── ツールボックスを更新 ──
  function refreshToolbox() {
    if (!window.blocklyWorkspace || !currentProject) return;
    var toolbox = getToolboxConfig(currentProject.boardType || 'pico');
    window.blocklyWorkspace.updateToolbox(toolbox);
  }

  // ── 全登録プラグインを取得 ──
  function getAll() {
    var list = [];
    for (var id in registry) {
      if (registry.hasOwnProperty(id)) {
        list.push(registry[id]);
      }
    }
    return list;
  }

  // ── 有効なプラグインを一括設定（プロジェクト読み込み用）──
  function setEnabledList(ids) {
    setEnabled(ids || []);
    // ブロック定義を初期化
    for (var i = 0; i < ids.length; i++) {
      initPlugin(ids[i]);
    }
    refreshToolbox();
  }

  // ── 全プラグインを無効化 ──
  function disableAll() {
    setEnabled([]);
    refreshToolbox();
  }

  // ── 公開 API ──
  return {
    register: register,
    enable: enable,
    disable: disable,
    disableAll: disableAll,
    isEnabled: isEnabled,
    getEnabled: getEnabled,
    setEnabledList: setEnabledList,
    getAll: getAll,
    getEnabledToolboxCategories: getEnabledToolboxCategories,
    refreshToolbox: refreshToolbox
  };

})();
