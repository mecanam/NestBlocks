import * as THREE from 'three';
import { OrbitControls }     from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { STLExporter }       from 'three/addons/exporters/STLExporter.js';
import { FontLoader }        from 'three/addons/loaders/FontLoader.js';
import { TextGeometry }      from 'three/addons/geometries/TextGeometry.js';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import { Line2 }               from 'three/addons/lines/Line2.js';
import { LineGeometry }        from 'three/addons/lines/LineGeometry.js';
import { LineSegments2 }       from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial }        from 'three/addons/lines/LineMaterial.js';

const csgEvaluator = new Evaluator();

// ── フォントキャッシュ（テキスト3D用）────────────────────
const FontCache = { font: null };
function loadFont() {
  new FontLoader().load(
    'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json',
    font => { FontCache.font = font; }
  );
}

// ── テーマ ─────────────────────────────────────────────────
const Theme = {
  get isDark() { return document.documentElement.dataset.theme === 'dark'; },
  bgColor()   { return this.isDark ? 0x0d1117 : 0xf0eeea; },
  apply() { Renderer.instance.setClearColor(this.bgColor()); Grid.update(); }
};
document.getElementById('theme-btn').addEventListener('click', () => {
  const next = Theme.isDark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('nc-theme', next);
  Theme.apply();
});
const savedTheme = localStorage.getItem('nc-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

// ── レンダラー ─────────────────────────────────────────────
const Renderer = {
  instance: null,
  init(canvas) {
    this.instance = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
    this.instance.setClearColor(Theme.bgColor());
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    const w = this.instance.domElement.clientWidth;
    const h = this.instance.domElement.clientHeight;
    this.instance.setSize(w, h, false);
    Camera.resize(w, h);
  }
};

// ── カメラ ─────────────────────────────────────────────────
const Camera = {
  instance: null,
  init() {
    const canvas = document.getElementById('nc-canvas');
    const w = canvas.clientWidth  || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.instance = new THREE.PerspectiveCamera(50, w / h, 0.1, 5000);
    this.instance.position.set(200, 160, 200);
    this.instance.lookAt(0, 0, 0);
  },
  resize(w, h) {
    if (!this.instance) return;
    this.instance.aspect = w / h;
    this.instance.updateProjectionMatrix();
  },
  resetView() { Controls.instance.reset(); }
};

const scene = new THREE.Scene();

// ── CAD ルートグループ（Z-up 空間）────────────────────────
const cadRoot = new THREE.Group();
cadRoot.rotation.x = -Math.PI / 2;
scene.add(cadRoot);

// ── OrbitControls ─────────────────────────────────────────
const Controls = {
  instance: null,
  init(camera, canvas) {
    this.instance = new OrbitControls(camera, canvas);
    this.instance.enableDamping = true;
    this.instance.dampingFactor = 0.08;
    this.instance.maxPolarAngle = Math.PI / 2;
    this.instance.saveState();
  }
};

// ── グリッド（cadRoot 内 XY 平面 = Z=0 床）────────────────
const Grid = {
  coarse: null, fine: null,
  init() {
    this.fine = new THREE.GridHelper(500, 100, 0xcccccc, 0xcccccc);
    this.fine.rotation.x = Math.PI / 2;
    this.fine.material.transparent = true; this.fine.material.opacity = 0.25;
    cadRoot.add(this.fine);

    this.coarse = new THREE.GridHelper(500, 10, 0xaaaaaa, 0xaaaaaa);
    this.coarse.rotation.x = Math.PI / 2;
    this.coarse.material.transparent = true; this.coarse.material.opacity = 0.45;
    cadRoot.add(this.coarse);
  },
  update() {
    if (this.coarse) this.coarse.material.color.set(Theme.isDark ? 0x2d333b : 0xc8c5bf);
    if (this.fine)   this.fine.material.color.set(Theme.isDark ? 0x21262d : 0xdedad5);
  }
};

// ── ライト ─────────────────────────────────────────────────
function initLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(150, 300, 200);
  sun.castShadow = true;
  sun.shadow.camera.near   = 1;
  sun.shadow.camera.far    = 1000;
  sun.shadow.camera.left   = -300;
  sun.shadow.camera.right  = 300;
  sun.shadow.camera.top    = 300;
  sun.shadow.camera.bottom = -300;
  sun.shadow.mapSize.width  = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xffffff, 0.3);
  fill.position.set(-100, 100, -100);
  scene.add(fill);
}

// ── トランスフォームギズモ ────────────────────────────────
// space='local' にすることで cadRoot local (Z-up) 軸に軸矢印が揃う
const Gizmo = {
  tc: null,
  mode: 'translate',

  init(camera, canvas) {
    this.tc = new TransformControls(camera, canvas);
    this.tc.setSpace('local');
    this.tc.setMode('translate');
    scene.add(this.tc);

    // ギズモ操作中は OrbitControls を無効にする
    this.tc.addEventListener('dragging-changed', (e) => {
      Controls.instance.enabled = !e.value;
    });

    // ギズモでオブジェクトが動いたらプロパティパネルとシーンツリーを更新
    this.tc.addEventListener('objectChange', () => {
      if (ObjectManager.selected) {
        UI.syncProps(ObjectManager.selected);
      }
    });
  },

  attach(mesh) {
    if (mesh && mesh.visible) {
      this.tc.attach(mesh);
    } else {
      this.tc.detach();
    }
  },

  detach() { this.tc.detach(); },

  setMode(mode) {
    this.mode = mode;
    this.tc.setMode(mode);
    document.querySelectorAll('.transform-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.transform === mode);
    });
    ['translate', 'rotate', 'scale'].forEach(m => {
      const el = document.getElementById(`props-section-${m}`);
      if (el) el.style.display = m === mode ? '' : 'none';
    });
    if (ObjectManager.selected) UI.syncProps(ObjectManager.selected);
  }
};

// ── シーンツリー ──────────────────────────────────────────
const TREE_ICONS = {
  box:
    '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' +
    '<polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  cylinder:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/>' +
    '<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>' +
    '<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  sphere:
    '<circle cx="12" cy="12" r="10"/>' +
    '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' +
    '<line x1="2" y1="12" x2="22" y2="12"/>',
  torus:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  capsule:
    '<rect x="8" y="4" width="8" height="16" rx="4"/>',
  polyhedron:
    '<polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/>',
  text3d:
    '<line x1="4" y1="7" x2="20" y2="7"/><line x1="12" y1="7" x2="12" y2="19"/>',
  gear:
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  bevel_gear:
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  sketch:
    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
    '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  boolean:
    '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
};

const EYE_OPEN  = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
const EYE_CLOSE = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

const SceneTree = {
  update() {
    const list  = document.getElementById('scene-tree-list');
    const count = document.getElementById('tree-count');
    const n = ObjectManager.objects.length;
    if (count) count.textContent = n;
    if (!list) return;

    if (n === 0) {
      list.innerHTML = '<div class="tree-empty">オブジェクトを追加すると<br>ここに表示されます</div>';
      return;
    }

    list.innerHTML = '';
    ObjectManager.objects.forEach(mesh => {
      const isSel  = mesh === ObjectManager.selected;
      const isSel2 = mesh === ObjectManager.selected2;
      const isHid  = !mesh.visible;

      const hexColor = '#' + new THREE.Color(mesh.userData.baseColor).getHexString();
      const item = document.createElement('div');
      item.className = 'tree-item' + (isSel ? ' selected' : '') + (isSel2 ? ' selected2' : '') + (isHid ? ' hidden-obj' : '');

      item.innerHTML =
        `<svg class="tree-item-icon" viewBox="0 0 24 24"
           style="stroke:${hexColor};fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round">
           ${TREE_ICONS[mesh.userData.type]}
         </svg>` +
        `<span class="tree-item-label">${mesh.userData.label}</span>` +
        `<button class="tree-vis-btn" title="${isHid ? '表示' : '非表示'}">
           <svg viewBox="0 0 24 24">${isHid ? EYE_CLOSE : EYE_OPEN}</svg>
         </button>`;

      // クリックで選択（表示/非表示ボタン以外）
      item.addEventListener('click', (e) => {
        if (e.target.closest('.tree-vis-btn')) return;
        if (e.ctrlKey || e.metaKey) {
          ObjectManager.select2(mesh);
        } else if (isSel) {
          ObjectManager.deselect();
        } else {
          ObjectManager.select(mesh);
        }
      });

      // 表示/非表示トグル
      item.querySelector('.tree-vis-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        mesh.visible = !mesh.visible;
        if (ObjectManager.selected === mesh) {
          if (mesh.visible) Gizmo.attach(mesh);
          else              Gizmo.detach();
        }
        SceneTree.update();
      });

      list.appendChild(item);
    });
  }
};

// ── モード管理 ────────────────────────────────────────────
const ModeManager = {
  current: 'primitive',
  switch(mode) {
    if (mode !== 'sketch' && Sketch.active) Sketch.exit();
    this.current = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    document.getElementById('panel-primitive').style.display = mode === 'primitive' ? '' : 'none';
    document.getElementById('panel-sketch').style.display    = mode === 'sketch'    ? '' : 'none';
    if (mode !== 'sketch') setStatus('プリミティブモード — シェイプを追加してください');
  }
};

// ── インボリュート平歯車プロファイル生成 ────────────────────
function buildSpurGearShape(z, m, alphaDeg) {
  const alpha  = alphaDeg * Math.PI / 180;
  const rp     = m * z / 2;
  const rb     = rp * Math.cos(alpha);
  const ra     = rp + m;
  const rf     = Math.max(rp - 1.25 * m, m * 0.1);
  const pitch  = 2 * Math.PI / z;
  const invAlpha = Math.tan(alpha) - alpha;

  // parameter t at addendum / at root (if root above base circle)
  const tAdd  = Math.sqrt(Math.max(0, (ra / rb) ** 2 - 1));
  const tRoot = rf >= rb ? Math.sqrt((rf / rb) ** 2 - 1) : 0;
  const needsRadialRoot = rf < rb;

  const invPt = t => [
    rb * (Math.cos(t) + t * Math.sin(t)),
    rb * (Math.sin(t) - t * Math.cos(t))
  ];
  const rot2 = ([x, y], a) => [
    x * Math.cos(a) - y * Math.sin(a),
    x * Math.sin(a) + y * Math.cos(a)
  ];

  // tooth 0 centered at angle 0 (right flank / left flank rotations)
  const phiR = -(Math.PI / (2 * z) + invAlpha);
  const phiL =   Math.PI / (2 * z) + invAlpha;

  // pre-compute tip and root angles for tooth 0
  const pAdd  = invPt(tAdd);
  const tipR0 = rot2(pAdd, phiR);
  const tipL0 = rot2([pAdd[0], -pAdd[1]], phiL);
  const angTipR0 = Math.atan2(tipR0[1], tipR0[0]);
  const angTipL0 = Math.atan2(tipL0[1], tipL0[0]);

  const pRoot = invPt(tRoot);
  const rootR0 = needsRadialRoot
    ? [rf * Math.cos(phiR), rf * Math.sin(phiR)]
    : rot2(pRoot, phiR);
  const rootL0 = needsRadialRoot
    ? [rf * Math.cos(phiL), rf * Math.sin(phiL)]
    : rot2([pRoot[0], -pRoot[1]], phiL);
  const angRootL0 = Math.atan2(rootL0[1], rootL0[0]);
  const angRootR0 = Math.atan2(rootR0[1], rootR0[0]);

  const N_inv = 10, N_tip = 3, N_root = 4;
  const pts = [];

  for (let i = 0; i < z; i++) {
    const off   = i * pitch;
    const phiRi = phiR + off;
    const phiLi = phiL + off;

    // right flank: root → addendum
    if (needsRadialRoot) pts.push([rf * Math.cos(phiRi), rf * Math.sin(phiRi)]);
    for (let k = 0; k <= N_inv; k++) {
      pts.push(rot2(invPt(tRoot + (tAdd - tRoot) * k / N_inv), phiRi));
    }

    // tip arc: right tip → left tip
    const aTR = angTipR0 + off, aTL = angTipL0 + off;
    for (let k = 1; k <= N_tip; k++) {
      const ang = aTR + (aTL - aTR) * k / N_tip;
      pts.push([ra * Math.cos(ang), ra * Math.sin(ang)]);
    }

    // left flank (mirrored): addendum → root
    for (let k = N_inv; k >= 0; k--) {
      const [x, y] = invPt(tRoot + (tAdd - tRoot) * k / N_inv);
      pts.push(rot2([x, -y], phiLi));
    }
    if (needsRadialRoot) pts.push([rf * Math.cos(phiLi), rf * Math.sin(phiLi)]);

    // root arc: left root → next tooth right root
    const aFrom = angRootL0 + off;
    const aTo   = angRootR0 + off + pitch;
    for (let k = 1; k <= N_root; k++) {
      const ang = aFrom + (aTo - aFrom) * k / N_root;
      pts.push([rf * Math.cos(ang), rf * Math.sin(ang)]);
    }
  }

  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  return shape;
}

// ── ベベルギアジオメトリ生成 ─────────────────────────────
function buildBevelGearGeo(z, m, alphaDeg, delta, b) {
  const r_e = m * z / 2;
  const Re  = r_e / Math.sin(delta);
  const Ri  = Math.max(Re - b, Re * 0.15);
  const kf  = Ri / Re;
  const z_i = b * Math.cos(delta);

  const shape  = buildSpurGearShape(z, m, alphaDeg);
  const allPts = shape.getPoints(z * 18 + 60);
  const first  = allPts[0], last = allPts[allPts.length - 1];
  if (Math.abs(first.x - last.x) < 1e-4 && Math.abs(first.y - last.y) < 1e-4) allPts.pop();
  const n = allPts.length;

  const innerPts = allPts.map(p => new THREE.Vector2(p.x * kf, p.y * kf));

  const verts = [];
  const idxs  = [];
  for (const p of allPts)   verts.push(p.x, p.y, 0);
  for (const p of innerPts) verts.push(p.x, p.y, z_i);

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idxs.push(i, j, n + i);
    idxs.push(j, n + j, n + i);
  }

  const fTris = THREE.ShapeUtils.triangulateShape(allPts, []);
  for (const [a, b2, c] of fTris) idxs.push(a, c, b2);

  const iTris = THREE.ShapeUtils.triangulateShape(innerPts, []);
  for (const [a, b2, c] of iTris) idxs.push(n + a, n + b2, n + c);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idxs);
  geo.computeVertexNormals();
  geo.translate(0, 0, -z_i / 2);
  geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  return geo;
}

// ── オブジェクト管理 ─────────────────────────────────────
const ObjectManager = {
  objects:  [],
  selected: null,
  counter:  { box: 0, cylinder: 0, sphere: 0, torus: 0, capsule: 0, polyhedron: 0, text3d: 0, gear: 0, bevel_gear: 0, sketch: 0, boolean: 0 },
  shapeColors: { box: 0x4A8FE7, cylinder: 0x34C759, sphere: 0xE04B16, torus: 0x8B6FE8, capsule: 0xFF9500, polyhedron: 0x20C9A0, text3d: 0xE05252, gear: 0xD4A644, bevel_gear: 0xC8922A, sketch: 0x5B8DEE, boolean: 0x4A8FE7 },

  add(type, params) {
    let geo, label;
    if (type === 'box') {
      geo   = new THREE.BoxGeometry(params.w, params.d, params.h);
      label = `ボックス ${++this.counter.box}`;
    } else if (type === 'cylinder') {
      geo = new THREE.CylinderGeometry(params.r, params.r, params.h, 32);
      geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      label = `円柱 ${++this.counter.cylinder}`;
    } else if (type === 'sphere') {
      geo   = new THREE.SphereGeometry(params.r, 32, 32);
      label = `球体 ${++this.counter.sphere}`;
    } else if (type === 'torus') {
      geo = new THREE.TorusGeometry(params.R, params.r, 24, 64);
      label = `トーラス ${++this.counter.torus}`;
    } else if (type === 'capsule') {
      geo = new THREE.CapsuleGeometry(params.r, params.h, 8, 24);
      geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      label = `カプセル ${++this.counter.capsule}`;
    } else if (type === 'polyhedron') {
      const builders = {
        icosahedron:  () => new THREE.IcosahedronGeometry(params.r, 0),
        dodecahedron: () => new THREE.DodecahedronGeometry(params.r, 0),
        octahedron:   () => new THREE.OctahedronGeometry(params.r, 0),
        tetrahedron:  () => new THREE.TetrahedronGeometry(params.r, 0),
      };
      geo = (builders[params.sub] || builders.icosahedron)();
      label = `多面体 ${++this.counter.polyhedron}`;
    } else if (type === 'text3d') {
      if (!FontCache.font) { setStatus('フォントを読み込み中です。しばらく待ってから再試行してください'); return null; }
      const tgeo = new TextGeometry(params.text, {
        font: FontCache.font, size: params.size, height: params.depth,
        curveSegments: 12, bevelEnabled: false,
      });
      tgeo.computeBoundingBox();
      tgeo.translate(-0.5 * (tgeo.boundingBox.max.x - tgeo.boundingBox.min.x), 0, 0);
      tgeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      geo = tgeo;
      label = `テキスト ${++this.counter.text3d}`;
    } else if (type === 'gear') {
      const shape = buildSpurGearShape(params.z, params.m, params.alpha);
      const extGeo = new THREE.ExtrudeGeometry(shape, { depth: params.b, bevelEnabled: false, curveSegments: 1 });
      extGeo.translate(0, 0, -params.b / 2);
      extGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      geo = extGeo;
      label = `ギア ${++this.counter.gear}`;
    } else if (type === 'bevel_gear') {
      const sigma  = params.sigma * Math.PI / 180;
      const delta1 = Math.atan2(Math.sin(sigma), params.ratio + Math.cos(sigma));
      const delta2 = sigma - delta1;
      const z1 = params.z;
      const z2 = Math.max(4, Math.round(z1 * params.ratio));

      const geo1 = buildBevelGearGeo(z1, params.m, params.alpha, delta1, params.b);
      const geo2 = buildBevelGearGeo(z2, params.m, params.alpha, delta2, params.b);

      const col1 = this.shapeColors.bevel_gear;
      const col2 = 0xC99A30;
      const mkMat = col => new THREE.MeshStandardMaterial({
        color: col, roughness: 0.3, metalness: 0.35, side: THREE.DoubleSide
      });
      const mesh1 = new THREE.Mesh(geo1, mkMat(col1));
      const mesh2 = new THREE.Mesh(geo2, mkMat(col2));
      mesh1.castShadow = mesh1.receiveShadow = true;
      mesh2.castShadow = mesh2.receiveShadow = true;

      const box1 = new THREE.Box3().setFromObject(mesh1);
      const box2 = new THREE.Box3().setFromObject(mesh2);
      mesh1.position.z = (box1.max.z - box1.min.z) / 2;
      mesh2.position.z = (box2.max.z - box2.min.z) / 2;
      mesh2.position.x = (params.m * z1 / 2 + params.m * z2 / 2) * 1.35;

      const bgNum = ++this.counter.bevel_gear;
      const lbl1  = `ベベルギア ${bgNum}a`;
      const lbl2  = `ベベルギア ${bgNum}b`;
      mesh1.userData = { type: 'bevel_gear', label: lbl1, params: { ...params, z: z1, delta: delta1 }, baseColor: col1, role: 'body' };
      mesh2.userData = { type: 'bevel_gear', label: lbl2, params: { ...params, z: z2, delta: delta2 }, baseColor: col2, role: 'body' };

      cadRoot.add(mesh1); cadRoot.add(mesh2);
      this.objects.push(mesh1); this.objects.push(mesh2);
      this.select(mesh1);
      UI.updateCount(this.objects.length);
      SceneTree.update();
      setStatus(`${lbl1} / ${lbl2} を追加しました`);
      return mesh1;
    } else {
      return null;
    }

    const baseColor = this.shapeColors[type];
    const mat  = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.45, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;

    const box3 = new THREE.Box3().setFromObject(mesh);
    mesh.position.z = (box3.max.z - box3.min.z) / 2;

    mesh.userData = { type, label, params: { ...params }, baseColor, role: 'body' };
    cadRoot.add(mesh);
    this.objects.push(mesh);
    this.select(mesh);
    UI.updateCount(this.objects.length);
    SceneTree.update();
    setStatus(`${label} を追加しました`);
    return mesh;
  },

  selected2: null,

  remove(mesh) {
    if (!mesh) return;
    const label = mesh.userData.label;
    cadRoot.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    this.objects.splice(this.objects.indexOf(mesh), 1);
    if (this.selected === mesh) {
      Gizmo.detach();
      this.selected = null;
      UI.showEmpty();
    }
    if (this.selected2 === mesh) this.selected2 = null;
    UI.updateCount(this.objects.length);
    SceneTree.update();
    updateBooleanButtons();
    setStatus(`${label} を削除しました`);
  },

  select(mesh) {
    if (this.selected && this.selected !== mesh) {
      this.selected.material.emissive.set(0x000000);
      this.selected.material.emissiveIntensity = 0;
    }
    if (this.selected2 === mesh) this.selected2 = null; // 2次選択から昇格
    this.selected = mesh;
    if (mesh) {
      mesh.material.emissive.set(0xE04B16);
      mesh.material.emissiveIntensity = 0.18;
      Gizmo.attach(mesh);
      UI.showObject(mesh);
    } else {
      Gizmo.detach();
      UI.showEmpty();
    }
    SceneTree.update();
    updateBooleanButtons();
  },

  select2(mesh) {
    if (!mesh || mesh === this.selected) return;
    if (this.selected2 === mesh) { this.deselect2(); return; } // トグル
    if (this.selected2) {
      this.selected2.material.emissive.set(0x000000);
      this.selected2.material.emissiveIntensity = 0;
    }
    this.selected2 = mesh;
    mesh.material.emissive.set(0x4A8FE7);
    mesh.material.emissiveIntensity = 0.25;
    setStatus('2つ目を選択しました。ブーリアン演算ボタンを押してください');
    SceneTree.update();
    updateBooleanButtons();
  },

  deselect2() {
    if (this.selected2) {
      this.selected2.material.emissive.set(0x000000);
      this.selected2.material.emissiveIntensity = 0;
      this.selected2 = null;
    }
    SceneTree.update();
    updateBooleanButtons();
  },

  deselect() {
    if (this.selected) {
      this.selected.material.emissive.set(0x000000);
      this.selected.material.emissiveIntensity = 0;
      this.selected = null;
    }
    if (this.selected2) {
      this.selected2.material.emissive.set(0x000000);
      this.selected2.material.emissiveIntensity = 0;
      this.selected2 = null;
    }
    Gizmo.detach();
    UI.showEmpty();
    SceneTree.update();
    updateBooleanButtons();
  }
};

// ── UI ──────────────────────────────────────────────────
const UI = {
  showObject(mesh) {
    document.getElementById('props-empty').style.display = 'none';
    const po = document.getElementById('props-object');
    po.style.display = 'flex';
    ['translate', 'rotate', 'scale'].forEach(m => {
      const el = document.getElementById(`props-section-${m}`);
      if (el) el.style.display = m === Gizmo.mode ? '' : 'none';
    });
    const roleSec = document.getElementById('props-section-role');
    if (roleSec) roleSec.style.display = mesh.userData.type === 'boolean' ? 'none' : '';
    const textSec = document.getElementById('props-section-text');
    if (textSec) textSec.style.display = mesh.userData.type === 'text3d' ? '' : 'none';
    this.syncProps(mesh);
  },

  syncProps(mesh) {
    document.getElementById('props-name').textContent = mesh.userData.label;
    document.getElementById('props-type').textContent = mesh.userData.type;
    const p = mesh.position;
    document.getElementById('prop-x').value = parseFloat(p.x.toFixed(2));
    document.getElementById('prop-y').value = parseFloat(p.y.toFixed(2));
    document.getElementById('prop-z').value = parseFloat(p.z.toFixed(2));
    const toDeg = rad => parseFloat((rad * 180 / Math.PI).toFixed(1));
    document.getElementById('prop-rx').value = toDeg(mesh.rotation.x);
    document.getElementById('prop-ry').value = toDeg(mesh.rotation.y);
    document.getElementById('prop-rz').value = toDeg(mesh.rotation.z);
    document.getElementById('prop-sx').value = parseFloat(mesh.scale.x.toFixed(3));
    document.getElementById('prop-sy').value = parseFloat(mesh.scale.y.toFixed(3));
    document.getElementById('prop-sz').value = parseFloat(mesh.scale.z.toFixed(3));
    const role = mesh.userData.role || 'body';
    document.querySelectorAll('.role-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.role === role);
    });
    if (mesh.userData.type === 'text3d') {
      document.getElementById('prop-text').value = mesh.userData.params.text;
    }
    document.getElementById('prop-color').value = '#' + mesh.material.color.getHexString();
    const { params, type } = mesh.userData;
    const sizeLabel = {
      box:        `W ${params.w}  D ${params.d}  H ${params.h} mm`,
      cylinder:   `φ${params.r * 2}  H ${params.h} mm`,
      sphere:     `φ${params.r * 2} mm`,
      torus:      `外径 φ${params.R * 2}  管 φ${params.r * 2} mm`,
      capsule:    `φ${params.r * 2}  H ${(params.h + params.r * 2).toFixed(1)} mm`,
      polyhedron: `R ${params.r} mm`,
      text3d:     `"${params.text}"  厚 ${params.depth} mm`,
      gear:       `z${params.z}  m${params.m}  φ${(params.m * params.z).toFixed(1)}mm (ピッチ円)  歯幅 ${params.b}mm`,
      bevel_gear: `z${params.z}  m${params.m}  δ${(params.delta * 180 / Math.PI).toFixed(1)}°  歯幅 ${params.b}mm`,
      sketch:     `${params.plane.toUpperCase()}平面  押し出し ${params.depth}mm`,
    }[type] || '—';
    document.getElementById('size-row').textContent = sizeLabel;
    document.getElementById('coord-display').textContent =
      `X:${p.x.toFixed(1)} Y:${p.y.toFixed(1)} Z:${p.z.toFixed(1)}`;
  },

  showEmpty() {
    document.getElementById('props-empty').style.display = '';
    document.getElementById('props-object').style.display = 'none';
    document.getElementById('coord-display').textContent = 'X:— Y:— Z:—';
  },

  updateCount(n) {
    document.getElementById('obj-count').textContent = `${n} オブジェクト`;
  }
};

function setStatus(msg) {
  const el = document.getElementById('status-text');
  if (el) el.textContent = msg;
}

// ── ブーリアン演算ボタンの有効/無効 ─────────────────
function updateBooleanButtons() {
  const hasPair = !!(ObjectManager.selected && ObjectManager.selected2);
  document.querySelectorAll('[data-boolean]').forEach(btn => {
    btn.disabled = !hasPair;
    btn.classList.toggle('disabled', !hasPair);
  });
}

// ── ブーリアン共通：geometry を cadRoot ローカル空間へ変換 ──
function toLocalGeo(mesh) {
  const geo = mesh.geometry.clone();
  mesh.updateMatrix();
  geo.applyMatrix4(mesh.matrix);
  return geo;
}

// ── ブーリアン演算 ────────────────────────────────────
function performBoolean(opName) {
  const meshA = ObjectManager.selected;
  const meshB = ObjectManager.selected2;
  if (!meshA || !meshB) { setStatus('Ctrl+クリックで2つ目のオブジェクトを選択してください'); return; }

  const roleA = meshA.userData.role || 'body';
  const roleB = meshB.userData.role || 'body';

  // 結合ボタン: ロールに応じて union / subtract を自動判定
  let op, label, solidMesh, toolMesh;
  if (opName === 'union') {
    if (roleB === 'cutter' && roleA === 'body') {
      op = SUBTRACTION; solidMesh = meshA; toolMesh = meshB;
      label = `${meshA.userData.label} − ${meshB.userData.label}`;
    } else if (roleA === 'cutter' && roleB === 'body') {
      op = SUBTRACTION; solidMesh = meshB; toolMesh = meshA;
      label = `${meshB.userData.label} − ${meshA.userData.label}`;
    } else {
      op = ADDITION; solidMesh = meshA; toolMesh = meshB;
      label = `${meshA.userData.label} ∪ ${meshB.userData.label}`;
    }
  } else {
    // 交差
    op = INTERSECTION; solidMesh = meshA; toolMesh = meshB;
    label = `${meshA.userData.label} ∩ ${meshB.userData.label}`;
  }

  const bSolid = new Brush(toLocalGeo(solidMesh)); bSolid.updateMatrixWorld();
  const bTool  = new Brush(toLocalGeo(toolMesh));  bTool.updateMatrixWorld();

  let result;
  try { result = csgEvaluator.evaluate(bSolid, bTool, op); }
  catch (err) { setStatus('演算に失敗しました: ' + err.message); console.error(err); return; }

  const baseColor = solidMesh.userData.baseColor;
  const opLabel   = op === SUBTRACTION ? '切り取り' : op === ADDITION ? '結合' : '交差';
  ObjectManager.deselect();
  [meshA, meshB].forEach(m => {
    cadRoot.remove(m); m.geometry.dispose(); m.material.dispose();
    const i = ObjectManager.objects.indexOf(m); if (i > -1) ObjectManager.objects.splice(i, 1);
  });

  const mat  = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.45, metalness: 0.1 });
  const mesh = new THREE.Mesh(result.geometry, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData  = { type: 'boolean', label, params: {}, baseColor, role: 'body' };
  cadRoot.add(mesh);
  ObjectManager.objects.push(mesh);
  ObjectManager.select(mesh);
  UI.updateCount(ObjectManager.objects.length);
  SceneTree.update();
  setStatus(`${label} — ${opLabel}完了`);
}

// ── テキストジオメトリ再ビルド ────────────────────────
function rebuildTextGeometry(mesh, newText) {
  if (!FontCache.font) return;
  const { size, depth } = mesh.userData.params;
  mesh.geometry.dispose();
  const tgeo = new TextGeometry(newText, {
    font: FontCache.font, size, height: depth,
    curveSegments: 12, bevelEnabled: false,
  });
  tgeo.computeBoundingBox();
  tgeo.translate(-0.5 * (tgeo.boundingBox.max.x - tgeo.boundingBox.min.x), 0, 0);
  tgeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  mesh.geometry = tgeo;
  mesh.position.z = (tgeo.boundingBox.max.z - tgeo.boundingBox.min.z) / 2;
  mesh.userData.params.text = newText;
  UI.syncProps(mesh);
}

// ── プロパティパネルのイベント ─────────────────────────
function initPropsEvents() {
  const syncPos = axis => e => {
    const mesh = ObjectManager.selected;
    if (!mesh) return;
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) { mesh.position[axis] = v; }
  };
  document.getElementById('prop-x').addEventListener('input', syncPos('x'));
  document.getElementById('prop-y').addEventListener('input', syncPos('y'));
  document.getElementById('prop-z').addEventListener('input', syncPos('z'));

  const toRad = deg => deg * Math.PI / 180;
  const syncRot = axis => e => {
    const mesh = ObjectManager.selected;
    if (!mesh) return;
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) { mesh.rotation[axis] = toRad(v); }
  };
  document.getElementById('prop-rx').addEventListener('input', syncRot('x'));
  document.getElementById('prop-ry').addEventListener('input', syncRot('y'));
  document.getElementById('prop-rz').addEventListener('input', syncRot('z'));

  const syncScale = axis => e => {
    const mesh = ObjectManager.selected;
    if (!mesh) return;
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0) { mesh.scale[axis] = v; }
  };
  document.getElementById('prop-sx').addEventListener('input', syncScale('x'));
  document.getElementById('prop-sy').addEventListener('input', syncScale('y'));
  document.getElementById('prop-sz').addEventListener('input', syncScale('z'));

  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mesh = ObjectManager.selected;
      if (!mesh) return;
      const role = btn.dataset.role;
      mesh.userData.role = role;
      if (role === 'cutter') {
        mesh.material.transparent = true;
        mesh.material.opacity = 0.35;
        mesh.material.depthWrite = false;
      } else {
        mesh.material.transparent = false;
        mesh.material.opacity = 1.0;
        mesh.material.depthWrite = true;
      }
      mesh.material.needsUpdate = true;
      document.querySelectorAll('.role-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.role === role);
      });
      updateBooleanButtons();
    });
  });

  document.getElementById('prop-text').addEventListener('input', e => {
    const mesh = ObjectManager.selected;
    if (!mesh || mesh.userData.type !== 'text3d') return;
    const newText = e.target.value;
    if (newText.trim()) rebuildTextGeometry(mesh, newText);
  });

  document.getElementById('prop-color').addEventListener('input', e => {
    const mesh = ObjectManager.selected;
    if (!mesh) return;
    const hex = parseInt(e.target.value.replace('#', ''), 16);
    mesh.material.color.set(hex);
    mesh.userData.baseColor = hex;
    SceneTree.update();
  });

  document.getElementById('delete-btn').addEventListener('click', () => {
    ObjectManager.remove(ObjectManager.selected);
  });
}

// ── キーボードショートカット ───────────────────────────
document.addEventListener('keydown', e => {
  if (document.activeElement.tagName === 'INPUT') return;
  switch (e.key) {
    case 'Delete':
    case 'Backspace': ObjectManager.remove(ObjectManager.selected); break;
    case 'Escape':    Sketch.active ? Sketch.exit() : ObjectManager.deselect(); break;
    case 'w': case 'W': Gizmo.setMode('translate'); break;
    case 'e': case 'E': Gizmo.setMode('rotate');    break;
    case 'r': case 'R': Gizmo.setMode('scale');      break;
    case 'Home':         Camera.resetView();          break;
  }
});

// ── 変換モードボタン ──────────────────────────────────
document.querySelectorAll('.transform-btn').forEach(btn => {
  btn.addEventListener('click', () => Gizmo.setMode(btn.dataset.transform));
});

// ── ブーリアン演算ボタン ──────────────────────────────
document.querySelectorAll('[data-boolean]').forEach(btn => {
  btn.addEventListener('click', () => { if (!btn.disabled) performBoolean(btn.dataset.boolean); });
});

// ── モードトグル ──────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => ModeManager.switch(btn.dataset.mode));
});

// ── 視点リセット ──────────────────────────────────────
document.getElementById('btn-reset-view').addEventListener('click', () => {
  Camera.resetView(); setStatus('視点をリセットしました');
});

// ── スケッチマネージャー ─────────────────────────────────
let sk_dblTimer = null;
const Sketch = {
  active: false,
  plane: 'xy',
  tool: 'line',
  entities: [],
  tempPts: [],
  tempStart: null,
  sketchRoot: null,
  worldPlane: null,
  entityMesh: null,
  previewMesh: null,
  cursorMesh: null,

  PLANES: {
    xy: { normal: new THREE.Vector3(0, 1, 0), label: 'XY (上面)' },
    xz: { normal: new THREE.Vector3(0, 0, 1), label: 'XZ (正面)' },
    yz: { normal: new THREE.Vector3(1, 0, 0), label: 'YZ (側面)' },
  },

  enter(plane) {
    if (this.active) this.exit();
    this.active = true;
    this.plane = plane;
    this.entities = [];
    this.tempPts = [];
    this.tempStart = null;
    this.worldPlane = new THREE.Plane(this.PLANES[plane].normal.clone(), 0);

    this.sketchRoot = new THREE.Group();
    cadRoot.add(this.sketchRoot);
    this._buildGrid();

    const skRes = new THREE.Vector2(
      Renderer.instance.domElement.clientWidth,
      Renderer.instance.domElement.clientHeight
    );
    const entGeo = new LineSegmentsGeometry();
    entGeo.setPositions([0, 0, 0, 0, 0, 0]);
    this.entityMesh = new LineSegments2(entGeo,
      new LineMaterial({ color: 0xFF5500, linewidth: 2, depthTest: false, resolution: skRes })
    );
    this.entityMesh.visible = false;
    this.sketchRoot.add(this.entityMesh);

    const preGeo = new LineGeometry();
    preGeo.setPositions([0, 0, 0, 0, 0, 0]);
    this.previewMesh = new Line2(preGeo,
      new LineMaterial({ color: 0xFFCC00, linewidth: 3, depthTest: false, resolution: skRes })
    );
    this.previewMesh.visible = false;
    this.sketchRoot.add(this.previewMesh);

    const curGeo = new THREE.BufferGeometry();
    curGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    this.cursorMesh = new THREE.Points(curGeo,
      new THREE.PointsMaterial({ color: 0x00FF88, size: 10, sizeAttenuation: false, depthTest: false })
    );
    this.sketchRoot.add(this.cursorMesh);

    document.getElementById('nc-canvas').style.cursor = 'crosshair';
    Controls.instance.mouseButtons.LEFT = null;
    ObjectManager.deselect();

    document.getElementById('sketch-entry').style.display = 'none';
    document.getElementById('sketch-tools').style.display = '';
    document.getElementById('sketch-plane-label').textContent = '作業平面: ' + this.PLANES[plane].label;
    this.setTool('line');
    this._updateExtrudeBtn();
    this._snapView(plane);
    setStatus('スケッチ (' + this.PLANES[plane].label + ')  クリックで描画  右ドラッグで視点操作');
  },

  exit() {
    if (!this.active) return;
    this.active = false;
    this.tempPts = [];
    this.tempStart = null;
    if (sk_dblTimer) { clearTimeout(sk_dblTimer); sk_dblTimer = null; }
    if (this.sketchRoot) {
      cadRoot.remove(this.sketchRoot);
      this.sketchRoot.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      this.sketchRoot = null;
      this.entityMesh = null;
      this.previewMesh = null;
      this.cursorMesh = null;
    }
    document.getElementById('nc-canvas').style.cursor = '';
    Controls.instance.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    document.getElementById('sketch-entry').style.display = '';
    document.getElementById('sketch-tools').style.display = 'none';
    setStatus('スケッチを終了しました');
  },

  setTool(t) {
    this.tool = t;
    this.tempPts = [];
    this.tempStart = null;
    this._clearPreview();
    document.querySelectorAll('[data-sketch-tool]').forEach(b =>
      b.classList.toggle('active', b.dataset.sketchTool === t)
    );
  },

  _getMousePt(e) {
    const canvas = document.getElementById('nc-canvas');
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, Camera.instance);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(this.worldPlane, hit)) return null;
    const lp = cadRoot.worldToLocal(hit);
    const sn = v => Math.round(v / 5) * 5;
    switch (this.plane) {
      case 'xy': return [sn(lp.x), sn(lp.y)];
      case 'xz': return [sn(lp.x), sn(lp.z)];
      case 'yz': return [sn(lp.y), sn(lp.z)];
    }
  },

  _to3D([a, b]) {
    switch (this.plane) {
      case 'xy': return new THREE.Vector3(a, b, 0);
      case 'xz': return new THREE.Vector3(a, 0, b);
      case 'yz': return new THREE.Vector3(0, a, b);
    }
  },

  handleClick(pt) {
    if (!pt) return;
    if (this.tool === 'line') {
      if (this.tempPts.length >= 3) {
        const fp = this.tempPts[0];
        if (Math.hypot(pt[0] - fp[0], pt[1] - fp[1]) < 2) {
          if (sk_dblTimer) { clearTimeout(sk_dblTimer); sk_dblTimer = null; }
          this._commit({ type: 'line', pts: [...this.tempPts] });
          this.tempPts = [];
          this._clearPreview();
          return;
        }
      }
      this.tempPts.push(pt);
      this._redraw();
      setStatus(`スケッチ [line]: 頂点 ${this.tempPts.length}個 / ダブルクリックまたは始点クリックで確定`);
    } else if (this.tool === 'rect') {
      if (!this.tempStart) {
        this.tempStart = pt;
        setStatus('スケッチ [rect]: 対角点をクリック');
      } else {
        this._commit({ type: 'rect', x1: this.tempStart[0], y1: this.tempStart[1], x2: pt[0], y2: pt[1] });
        this.tempStart = null;
        this._clearPreview();
        setStatus('スケッチ [rect]: 1点目をクリック');
      }
    } else if (this.tool === 'circle') {
      if (!this.tempStart) {
        this.tempStart = pt;
        setStatus('スケッチ [circle]: 円周上の点をクリック');
      } else {
        const r = Math.hypot(pt[0] - this.tempStart[0], pt[1] - this.tempStart[1]);
        if (r > 0.5) this._commit({ type: 'circle', cx: this.tempStart[0], cy: this.tempStart[1], r });
        this.tempStart = null;
        this._clearPreview();
        setStatus('スケッチ [circle]: 中心をクリック');
      }
    }
  },

  handleDblClick(pt) {
    if (!pt || this.tool !== 'line') return;
    if (this.tempPts.length > 0) this.tempPts.pop();
    if (this.tempPts.length >= 2) this._commit({ type: 'line', pts: [...this.tempPts] });
    this.tempPts = [];
    this._clearPreview();
    this._redraw();
  },

  handleMove(e) {
    if (!this.active || !this.previewMesh) return;
    const pt = this._getMousePt(e);
    if (!pt) return;
    if (this.cursorMesh) {
      const cp = this._to3D(pt);
      this.cursorMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute([cp.x, cp.y, cp.z], 3));
      this.cursorMesh.geometry.computeBoundingSphere();
    }
    let pts3d = [];
    if (this.tool === 'line' && this.tempPts.length > 0) {
      const last = this.tempPts[this.tempPts.length - 1];
      pts3d = [this._to3D(last), this._to3D(pt)];
    } else if (this.tool === 'rect' && this.tempStart) {
      const [x1, y1] = this.tempStart, [x2, y2] = pt;
      pts3d = [[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]].map(c => this._to3D(c));
    } else if (this.tool === 'circle' && this.tempStart) {
      const r = Math.hypot(pt[0]-this.tempStart[0], pt[1]-this.tempStart[1]);
      const [cx, cy] = this.tempStart;
      pts3d = Array.from({length: 49}, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return this._to3D([cx + r*Math.cos(a), cy + r*Math.sin(a)]);
      });
    }
    if (pts3d.length >= 2) {
      const arr = []; pts3d.forEach(p => arr.push(p.x, p.y, p.z));
      this.previewMesh.geometry.setPositions(arr);
      this.previewMesh.visible = true;
    } else {
      this.previewMesh.visible = false;
    }
  },

  _clearPreview() {
    if (!this.previewMesh) return;
    this.previewMesh.visible = false;
  },

  _commit(entity) {
    this.entities.push(entity);
    this._redraw();
    this._updateExtrudeBtn();
  },

  _redraw() {
    if (!this.entityMesh) return;
    const segs = [];
    const addSeg = (a, b) => {
      const p = this._to3D(a), q = this._to3D(b);
      segs.push(p.x, p.y, p.z, q.x, q.y, q.z);
    };
    for (const e of this.entities) {
      if (e.type === 'line') {
        for (let i = 0; i < e.pts.length - 1; i++) addSeg(e.pts[i], e.pts[i+1]);
        if (e.pts.length >= 3) addSeg(e.pts[e.pts.length-1], e.pts[0]);
      } else if (e.type === 'rect') {
        const c = [[e.x1,e.y1],[e.x2,e.y1],[e.x2,e.y2],[e.x1,e.y2]];
        for (let i = 0; i < 4; i++) addSeg(c[i], c[(i+1)%4]);
      } else if (e.type === 'circle') {
        for (let i = 0; i < 48; i++) {
          const a1 = (i/48)*Math.PI*2, a2 = ((i+1)/48)*Math.PI*2;
          addSeg([e.cx + e.r*Math.cos(a1), e.cy + e.r*Math.sin(a1)],
                 [e.cx + e.r*Math.cos(a2), e.cy + e.r*Math.sin(a2)]);
        }
      }
    }
    for (let i = 0; i < this.tempPts.length - 1; i++) addSeg(this.tempPts[i], this.tempPts[i+1]);
    this.entityMesh.geometry.dispose();
    const newEntGeo = new LineSegmentsGeometry();
    newEntGeo.setPositions(segs.length ? segs : [0, 0, 0, 0, 0, 0]);
    this.entityMesh.geometry = newEntGeo;
    this.entityMesh.visible = segs.length > 0;
  },

  _buildGrid() {
    const SIZE = 200;
    const segs = [];
    for (let v = -SIZE; v <= SIZE; v += 5) {
      const p1 = this._to3D([-SIZE, v]), p2 = this._to3D([SIZE, v]);
      const p3 = this._to3D([v, -SIZE]), p4 = this._to3D([v, SIZE]);
      segs.push(p1.x,p1.y,p1.z, p2.x,p2.y,p2.z, p3.x,p3.y,p3.z, p4.x,p4.y,p4.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    this.sketchRoot.add(new THREE.LineSegments(geo,
      new THREE.LineBasicMaterial({ color: 0x4A7FA5, transparent: true, opacity: 0.55, depthTest: false })
    ));
  },

  _snapView(plane) {
    const cam  = Camera.instance;
    const ctrl = Controls.instance;
    const D    = 300;
    ctrl.target.set(0, 0, 0);
    switch (plane) {
      case 'xy': cam.position.set(0, D, 0.01); cam.up.set(0, 0, -1); break;
      case 'xz': cam.position.set(0, 0, D);    cam.up.set(0, 1,  0); break;
      case 'yz': cam.position.set(D, 0, 0);    cam.up.set(0, 1,  0); break;
    }
    cam.lookAt(0, 0, 0);
    ctrl.update();
  },

  _updateExtrudeBtn() {
    const btn = document.getElementById('sketch-extrude-btn');
    if (btn) btn.disabled = this.entities.length === 0;
  },

  extrude() {
    const depth = Math.max(0.1, parseFloat(document.getElementById('sketch-depth').value) || 10);
    if (!this.entities.length) { setStatus('スケッチに要素がありません'); return; }

    const shapes = this.entities.map(e => {
      const s = new THREE.Shape();
      if (e.type === 'rect') {
        s.moveTo(e.x1, e.y1); s.lineTo(e.x2, e.y1);
        s.lineTo(e.x2, e.y2); s.lineTo(e.x1, e.y2); s.closePath();
      } else if (e.type === 'circle') {
        s.absarc(e.cx, e.cy, e.r, 0, Math.PI * 2, false);
      } else if (e.type === 'line' && e.pts.length >= 2) {
        s.moveTo(e.pts[0][0], e.pts[0][1]);
        for (let i = 1; i < e.pts.length; i++) s.lineTo(e.pts[i][0], e.pts[i][1]);
        s.closePath();
      } else return null;
      return s;
    }).filter(Boolean);

    if (!shapes.length) { setStatus('押し出し可能な図形がありません'); return; }

    const geo = new THREE.ExtrudeGeometry(shapes.length === 1 ? shapes[0] : shapes, {
      depth, bevelEnabled: false, curveSegments: 48
    });

    if (this.plane === 'xz') {
      geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    } else if (this.plane === 'yz') {
      geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      geo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    }

    const col = ObjectManager.shapeColors.sketch;
    const mesh = new THREE.Mesh(geo,
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.1 })
    );
    mesh.castShadow = mesh.receiveShadow = true;

    const n = ++ObjectManager.counter.sketch;
    mesh.userData = {
      type: 'sketch', label: `スケッチ ${n}`,
      params: { plane: this.plane, depth, entityCount: this.entities.length },
      baseColor: col, role: 'body',
    };

    cadRoot.add(mesh);
    ObjectManager.objects.push(mesh);
    ObjectManager.select(mesh);
    UI.updateCount(ObjectManager.objects.length);
    SceneTree.update();
    setStatus(`スケッチ ${n} を押し出しました (${depth}mm / ${this.PLANES[this.plane].label})`);
    this.exit();
  },
};

// ── レイキャスト（クリック選択）────────────────────
const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();
let pointerDown = { x: 0, y: 0 };

document.getElementById('nc-canvas').addEventListener('pointerdown', e => {
  pointerDown = { x: e.clientX, y: e.clientY };
});
document.getElementById('nc-canvas').addEventListener('pointerup', e => {
  // スケッチモード
  if (Sketch.active) {
    if (e.button !== 0) return;
    if (Math.abs(e.clientX - pointerDown.x) > 4 || Math.abs(e.clientY - pointerDown.y) > 4) return;
    const pt = Sketch._getMousePt(e);
    if (Sketch.tool === 'line') {
      if (sk_dblTimer) {
        clearTimeout(sk_dblTimer);
        sk_dblTimer = null;
        Sketch.handleDblClick(pt);
      } else {
        Sketch.handleClick(pt);
        sk_dblTimer = setTimeout(() => { sk_dblTimer = null; }, 260);
      }
    } else {
      Sketch.handleClick(pt);
    }
    return;
  }

  // 通常モード（ギズモ操作中またはドラッグは無視）
  if (Gizmo.tc.dragging) return;
  if (Math.abs(e.clientX - pointerDown.x) > 4 || Math.abs(e.clientY - pointerDown.y) > 4) return;

  const rect = e.target.getBoundingClientRect();
  pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, Camera.instance);
  const visible = ObjectManager.objects.filter(m => m.visible);
  const hits = raycaster.intersectObjects(visible);
  if (hits.length > 0) {
    const hit = hits[0].object;
    if (e.ctrlKey || e.metaKey) ObjectManager.select2(hit);
    else                         ObjectManager.select(hit);
  } else {
    if (!(e.ctrlKey || e.metaKey)) ObjectManager.deselect();
  }
});

document.getElementById('nc-canvas').addEventListener('pointermove', e => {
  if (Sketch.active) Sketch.handleMove(e);
});

// ── シェイプ追加モーダル ─────────────────────────────
const Modal = {
  currentType: null,
  open(type) {
    this.currentType = type;
    document.getElementById('modal-title').textContent = {
      box: 'ボックスを追加', cylinder: '円柱を追加', sphere: '球体を追加',
      torus: 'トーラスを追加', capsule: 'カプセルを追加',
      polyhedron: '多面体を追加', text3d: 'テキストを追加',
      gear: '平歯車を追加',
      bevel_gear: 'ベベルギアを追加',
    }[type];
    const iconPaths = {
      box:       '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
      cylinder:  '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
      sphere:    '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/>',
      torus:     '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
      capsule:   '<rect x="8" y="4" width="8" height="16" rx="4"/>',
      polyhedron:'<polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/>',
      text3d:    '<line x1="4" y1="7" x2="20" y2="7"/><line x1="12" y1="7" x2="12" y2="19"/>',
      gear:      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      bevel_gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    };
    document.getElementById('modal-icon-svg').innerHTML = iconPaths[type];

    const inputs = document.getElementById('modal-inputs');
    inputs.innerHTML = '';
    const fields = {
      box:      [{ id:'f-w', label:'幅 — X (mm)', val:20 }, { id:'f-d', label:'奥行き — Y (mm)', val:20 }, { id:'f-h', label:'高さ — Z (mm)', val:20 }],
      cylinder: [{ id:'f-r', label:'半径 (mm)', val:10 }, { id:'f-h', label:'高さ — Z (mm)', val:30 }],
      sphere:   [{ id:'f-r', label:'半径 (mm)', val:15 }],
      torus:    [{ id:'f-R', label:'中心半径 (mm)', val:20 }, { id:'f-r', label:'管径 — チューブ半径 (mm)', val:5 }],
      capsule:  [{ id:'f-r', label:'半径 (mm)', val:8 }, { id:'f-h', label:'円柱部分の長さ (mm)', val:20 }],
      polyhedron: [
        { id:'f-r', label:'半径 (mm)', val:15 },
        { id:'f-sub', label:'種類', kind:'select', val:'icosahedron', options:[
          { val:'icosahedron',  label:'正二十面体' },
          { val:'dodecahedron', label:'正十二面体' },
          { val:'octahedron',   label:'正八面体' },
          { val:'tetrahedron',  label:'正四面体' },
        ]},
      ],
      text3d: [
        { id:'f-text', label:'テキスト (英数字)', kind:'text', val:'NestCAD' },
        { id:'f-size',  label:'文字サイズ (mm)', val:15 },
        { id:'f-depth', label:'厚み (mm)', val:5 },
      ],
      gear: [
        { id:'f-z',     label:'歯数',          val:20,   min:4,   step:1   },
        { id:'f-m',     label:'モジュール (mm)', val:2,    min:0.5, step:0.5 },
        { id:'f-alpha', label:'圧力角', kind:'select', val:'20', options:[
          { val:'14.5', label:'14.5°' },
          { val:'20',   label:'20°（標準）' },
          { val:'25',   label:'25°' },
        ]},
        { id:'f-b',     label:'歯幅 (mm)',      val:10,   min:1,   step:1   },
      ],
      bevel_gear: [
        { id:'f-sigma', label:'取り付け角度 Σ (°)', val:90, min:10,  step:5   },
        { id:'f-ratio', label:'減速比 i (z₂/z₁)',   val:2,  min:0.2, step:0.1 },
        { id:'f-z',     label:'駆動歯車 歯数 z₁',    val:16, min:4,   step:1   },
        { id:'f-m',     label:'モジュール (mm)',      val:2,  min:0.5, step:0.5 },
        { id:'f-alpha', label:'圧力角', kind:'select', val:'20', options:[
          { val:'14.5', label:'14.5°' },
          { val:'20',   label:'20°（標準）' },
          { val:'25',   label:'25°' },
        ]},
        { id:'f-b',     label:'歯幅 (mm)', val:8, min:1, step:1 },
      ],
    }[type];
    fields.forEach(f => {
      const div = document.createElement('div');
      div.className = 'modal-field';
      if (f.kind === 'select') {
        const opts = f.options.map(o =>
          `<option value="${o.val}"${o.val === f.val ? ' selected' : ''}>${o.label}</option>`
        ).join('');
        div.innerHTML = `<label for="${f.id}">${f.label}</label><select id="${f.id}">${opts}</select>`;
      } else if (f.kind === 'text') {
        div.innerHTML = `<label for="${f.id}">${f.label}</label><input type="text" id="${f.id}" value="${f.val}">`;
      } else {
        const minA = f.min ?? 0.1, stepA = f.step ?? 0.5;
        div.innerHTML = `<label for="${f.id}">${f.label}</label><input type="number" id="${f.id}" value="${f.val}" min="${minA}" step="${stepA}">`;
      }
      inputs.appendChild(div);
    });
    setTimeout(() => inputs.querySelector('input, select')?.focus(), 80);
    document.getElementById('nc-modal').classList.add('open');
  },
  close() {
    document.getElementById('nc-modal').classList.remove('open');
    this.currentType = null;
  },
  confirm() {
    const type = this.currentType;
    if (!type) return;
    const g  = id => parseFloat(document.getElementById(id)?.value) || 0;
    const gs = id => document.getElementById(id)?.value ?? '';
    let params;
    if      (type === 'box')       params = { w: g('f-w'), d: g('f-d'), h: g('f-h') };
    else if (type === 'cylinder')  params = { r: g('f-r'), h: g('f-h') };
    else if (type === 'sphere')    params = { r: g('f-r') };
    else if (type === 'torus')     params = { R: g('f-R'), r: g('f-r') };
    else if (type === 'capsule')   params = { r: g('f-r'), h: g('f-h') };
    else if (type === 'polyhedron') params = { r: g('f-r'), sub: gs('f-sub') };
    else if (type === 'gear') {
      params = {
        z:     Math.max(4, Math.round(g('f-z') || 20)),
        m:     Math.max(0.5, g('f-m') || 2),
        alpha: parseFloat(gs('f-alpha')) || 20,
        b:     Math.max(1, g('f-b') || 10),
      };
    }
    else if (type === 'bevel_gear') {
      params = {
        sigma: Math.max(10, Math.min(170, g('f-sigma') || 90)),
        ratio: Math.max(0.2, Math.min(10,  g('f-ratio') || 2)),
        z:     Math.max(4, Math.round(g('f-z') || 16)),
        m:     Math.max(0.5, g('f-m') || 2),
        alpha: parseFloat(gs('f-alpha')) || 20,
        b:     Math.max(1, g('f-b') || 8),
      };
    }
    else if (type === 'text3d') {
      const text = gs('f-text').trim();
      if (!text) { alert('テキストを入力してください'); return; }
      params = { text, size: g('f-size'), depth: g('f-depth') };
      if (params.size <= 0 || params.depth <= 0) { alert('サイズと厚みは 0 より大きくしてください'); return; }
      ObjectManager.add(type, params);
      this.close();
      return;
    }
    const numVals = Object.values(params).filter(v => typeof v === 'number');
    if (!numVals.every(v => v > 0)) { alert('値は 0 より大きくしてください'); return; }
    ObjectManager.add(type, params);
    this.close();
  }
};

document.querySelectorAll('[data-shape]').forEach(btn => {
  btn.addEventListener('click', () => Modal.open(btn.dataset.shape));
});
document.getElementById('modal-cancel').addEventListener('click',  () => Modal.close());
document.getElementById('modal-confirm').addEventListener('click', () => Modal.confirm());
document.getElementById('nc-modal').addEventListener('click', e => { if (e.target === e.currentTarget) Modal.close(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('nc-modal').classList.contains('open')) Modal.confirm();
});

// ── スケッチボタン ────────────────────────────────────
document.querySelectorAll('[data-sketch-plane]').forEach(btn => {
  btn.addEventListener('click', () => Sketch.enter(btn.dataset.sketchPlane));
});
document.querySelectorAll('[data-sketch-tool]').forEach(btn => {
  btn.addEventListener('click', () => Sketch.setTool(btn.dataset.sketchTool));
});
document.getElementById('sketch-extrude-btn').addEventListener('click', () => Sketch.extrude());
document.getElementById('sketch-exit-btn').addEventListener('click', () => Sketch.exit());

// ── STL 書き出し（Z-up, 回転変換なし）───────────────
document.getElementById('btn-export-stl').addEventListener('click', () => {
  if (ObjectManager.objects.length === 0) { setStatus('書き出すオブジェクトがありません'); return; }
  const exporter    = new STLExporter();
  const exportGroup = new THREE.Group();
  ObjectManager.objects.forEach(m => exportGroup.add(m.clone()));
  exportGroup.updateMatrixWorld(true);
  const stl  = exporter.parse(exportGroup, { binary: true });
  const blob = new Blob([stl], { type: 'application/octet-stream' });
  const a    = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nestcad_model.stl';
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus('STL ファイルを書き出しました');
});

// ── 軸インジケーター（2D Canvas 描画）────────────────
const AxisIndicator = {
  canvas: null, ctx: null, dpr: 1, SIZE: 100,
  init(container) {
    this.dpr = Math.min(window.devicePixelRatio, 2);
    const { SIZE, dpr } = this;
    this.canvas = document.createElement('canvas');
    this.canvas.width  = SIZE * dpr;
    this.canvas.height = SIZE * dpr;
    this.canvas.style.cssText = `position:absolute;bottom:10px;right:12px;width:${SIZE}px;height:${SIZE}px;pointer-events:none;border-radius:50%;`;
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  },
  update() {
    const { ctx, SIZE, dpr } = this;
    const W = SIZE * dpr, cx = W / 2, cy = W / 2, len = W * 0.33;
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2);
    ctx.fillStyle = Theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'; ctx.fill();

    Camera.instance.updateMatrixWorld();
    cadRoot.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(Camera.instance.matrixWorld, 0);
    const up    = new THREE.Vector3().setFromMatrixColumn(Camera.instance.matrixWorld, 1);
    const fwd   = new THREE.Vector3().setFromMatrixColumn(Camera.instance.matrixWorld, 2);

    const axes = [
      { local: new THREE.Vector3(1,0,0), color:'#E05252', label:'X' },
      { local: new THREE.Vector3(0,1,0), color:'#34C759', label:'Y' },
      { local: new THREE.Vector3(0,0,1), color:'#4A8FE7', label:'Z' },
    ];
    for (const ax of axes) {
      const w = ax.local.clone().transformDirection(cadRoot.matrixWorld);
      ax.sx = w.dot(right) * len + cx;
      ax.sy = -w.dot(up) * len + cy;
      ax.depth = w.dot(fwd);
    }
    axes.sort((a, b) => b.depth - a.depth);
    for (const ax of axes) {
      const alpha = ax.depth > 0.15 ? 0.28 : 1.0;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax.sx, ax.sy);
      ctx.strokeStyle = ax.color; ctx.lineWidth = 2.8 * dpr; ctx.lineCap = 'round'; ctx.stroke();
      const lx = cx + (ax.sx - cx) * 1.38, ly = cy + (ax.sy - cy) * 1.38;
      ctx.font = `900 ${Math.round(13 * dpr)}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = ax.color; ctx.fillText(ax.label, lx, ly);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = Theme.isDark ? '#aaa' : '#666'; ctx.fill();
  }
};

// ── レンダーループ ─────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  Controls.instance.update();
  Renderer.instance.render(scene, Camera.instance);
  AxisIndicator.update();
}

// ── 初期化 ────────────────────────────────────────────
function init() {
  const canvas = document.getElementById('nc-canvas');
  Camera.init();
  Renderer.init(canvas);
  Controls.init(Camera.instance, canvas);
  Gizmo.init(Camera.instance, canvas);
  Grid.init(); Grid.update();
  initLights();
  initPropsEvents();
  AxisIndicator.init(document.querySelector('.nc-viewport-wrap'));
  loadFont();
  animate();
}

// レイアウト確定後に初期化（canvas の clientWidth/clientHeight が 0 にならないように）
requestAnimationFrame(init);
