// ──────────────────────────────
// NestDB — IndexedDB プロジェクト管理
// ──────────────────────────────
var NestDB = (function () {

  var DB_NAME = 'NestBlocks';
  var DB_VERSION = 1;
  var STORE_NAME = 'projects';
  var db = null;

  // ── DB を開く（初回はストア作成 + localStorage マイグレーション）──
  function open() {
    if (db) return Promise.resolve(db);

    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_NAME)) {
          var store = d.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      req.onsuccess = function (e) {
        db = e.target.result;
        resolve(db);
      };

      req.onerror = function (e) {
        console.error('[NestDB] DB を開けません:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  // ── トランザクションヘルパー ──
  function getStore(mode) {
    var tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
  }

  function reqToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  // ── 一意な ID 生成 ──
  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
  }

  // ── CRUD 操作 ──

  // 全プロジェクト取得（updatedAt 降順）
  function getAll() {
    return open().then(function () {
      return reqToPromise(getStore('readonly').getAll());
    }).then(function (projects) {
      projects.sort(function (a, b) {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      return projects;
    });
  }

  // ID でプロジェクト取得
  function getById(id) {
    return open().then(function () {
      return reqToPromise(getStore('readonly').get(id));
    });
  }

  // 名前でプロジェクト検索（最初の1件）
  function getByName(name) {
    return open().then(function () {
      var store = getStore('readonly');
      var index = store.index('name');
      return reqToPromise(index.getAll(name));
    }).then(function (results) {
      return results.length > 0 ? results[0] : null;
    });
  }

  // プロジェクト保存（新規 or 更新）
  function save(project) {
    return open().then(function () {
      if (!project.id) {
        project.id = generateId();
      }
      if (!project.createdAt) {
        project.createdAt = new Date().toISOString();
      }
      project.updatedAt = new Date().toISOString();
      return reqToPromise(getStore('readwrite').put(project));
    }).then(function () {
      return project;
    });
  }

  // プロジェクト削除
  function remove(id) {
    return open().then(function () {
      return reqToPromise(getStore('readwrite').delete(id));
    });
  }

  // 全プロジェクト削除
  function clear() {
    return open().then(function () {
      return reqToPromise(getStore('readwrite').clear());
    });
  }

  // プロジェクト数を取得
  function count() {
    return open().then(function () {
      return reqToPromise(getStore('readonly').count());
    });
  }

  // ── localStorage マイグレーション ──
  function migrateFromLocalStorage() {
    var LEGACY_KEY = 'nb-autosave';
    var raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return Promise.resolve(false);

    var projects;
    try {
      projects = JSON.parse(raw);
    } catch (e) {
      return Promise.resolve(false);
    }
    if (!Array.isArray(projects) || projects.length === 0) {
      return Promise.resolve(false);
    }

    console.log('[NestDB] localStorage から ' + projects.length + ' 件のプロジェクトをマイグレーション中…');

    return open().then(function () {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var promises = [];

      for (var i = 0; i < projects.length; i++) {
        var p = projects[i];
        var proj = {
          id: generateId(),
          name: p.name || '無題のプロジェクト',
          boardType: p.boardType || 'pico',
          xml: p.xml || null,
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString()
        };
        promises.push(reqToPromise(store.put(proj)));
      }

      return Promise.all(promises);
    }).then(function () {
      // マイグレーション完了後、localStorage を削除
      localStorage.removeItem(LEGACY_KEY);
      console.log('[NestDB] マイグレーション完了');
      return true;
    }).catch(function (err) {
      console.error('[NestDB] マイグレーションエラー:', err);
      return false;
    });
  }

  // ── 初期化（open + マイグレーション）──
  function init() {
    return open().then(function () {
      return migrateFromLocalStorage();
    });
  }

  // ── 公開 API ──
  return {
    init: init,
    getAll: getAll,
    getById: getById,
    getByName: getByName,
    save: save,
    remove: remove,
    clear: clear,
    count: count
  };

})();
