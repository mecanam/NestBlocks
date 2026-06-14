// ──────────────────────────────
// Blockly ツールボックス定義
// ボード別に動的生成
// シャドウブロックでデフォルト値を設定
// ──────────────────────────────

// ── シャドウブロック生成ヘルパー ──
function _num(val) { return { shadow: { type: 'math_number', fields: { NUM: val } } }; }
function _text(val) { return { shadow: { type: 'text', fields: { TEXT: val } } }; }

// ── 全ボード共通カテゴリ ──
var TOOLBOX_SHARED_CATEGORIES = [
  {
    kind: 'category', name: '基本', colour: '#4A90D9',
    contents: [
      { kind: 'block', type: 'setup_block' },
      { kind: 'block', type: 'forever_loop' },
      { kind: 'block', type: 'sleep', inputs: { DURATION: _num(1) } }
    ]
  },
  {
    kind: 'category', name: '論理', colour: '#8B6FE8',
    contents: [
      { kind: 'block', type: 'controls_if' },
      { kind: 'block', type: 'logic_compare' },
      { kind: 'block', type: 'logic_operation' },
      { kind: 'block', type: 'logic_negate' },
      { kind: 'block', type: 'logic_boolean' }
    ]
  },
  {
    kind: 'category', name: 'ループ', colour: '#8CB43D',
    contents: [
      { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: _num(10) } },
      { kind: 'block', type: 'controls_whileUntil' },
      { kind: 'block', type: 'controls_for', inputs: { FROM: _num(1), TO: _num(10), BY: _num(1) } }
    ]
  },
  {
    kind: 'category', name: '数学', colour: '#5BA0E0',
    contents: [
      { kind: 'block', type: 'math_number' },
      { kind: 'block', type: 'math_arithmetic', inputs: { A: _num(1), B: _num(1) } },
      { kind: 'block', type: 'math_single', inputs: { NUM: _num(9) } },
      { kind: 'block', type: 'math_trig', inputs: { NUM: _num(45) } },
      { kind: 'block', type: 'math_clamp', inputs: { VALUE: _num(0), LOW: _num(-100), HIGH: _num(100) } }
    ]
  },
  {
    kind: 'category', name: 'テキスト', colour: '#5CA68E',
    contents: [
      { kind: 'block', type: 'text' },
      { kind: 'block', type: 'text_join', inputs: { A: _text('Hello'), B: _text(' World') } },
      { kind: 'block', type: 'text_length', inputs: { VALUE: _text('abc') } }
    ]
  },
  {
    kind: 'category', name: 'リスト', colour: '#745CA6',
    contents: [
      { kind: 'block', type: 'list_create' },
      { kind: 'sep', gap: '12' },
      { kind: 'block', type: 'list_get', inputs: { INDEX: _num(0) } },
      { kind: 'block', type: 'list_set', inputs: { INDEX: _num(0) } },
      { kind: 'block', type: 'list_append' },
      { kind: 'block', type: 'list_length' }
    ]
  },
  {
    kind: 'category', name: '変数', colour: '#E05A5A',
    custom: 'VARIABLE'
  },
  {
    kind: 'category', name: '関数', colour: '#9966FF',
    custom: 'PROCEDURE'
  },
  {
    kind: 'category', name: 'シリアル通信', colour: '#5DC06C',
    contents: [
      { kind: 'block', type: 'print', inputs: { VALUE: _text('Hello') } }
    ]
  },
  {
    kind: 'category', name: 'グラフ', colour: '#E8724A',
    contents: [
      { kind: 'block', type: 'graph_add_data', inputs: { VALUE: _num(0) } }
    ]
  }
];

// ── ボード別カテゴリ ──
var TOOLBOX_BOARD_CATEGORIES = {
  pico: [
    {
      kind: 'category', name: '出力', colour: '#E8724A',
      contents: [
        { kind: 'block', type: 'led_control' },
        { kind: 'block', type: 'digital_write' },
        { kind: 'block', type: 'analog_write', inputs: { VALUE: _num(32768) } },
        { kind: 'block', type: 'analog_write_percent', inputs: { PERCENT: _num(50) } }
      ]
    },
    {
      kind: 'category', name: '入力', colour: '#5BA0E0',
      contents: [
        { kind: 'block', type: 'digital_read' },
        { kind: 'block', type: 'analog_read' }
      ]
    },
    {
      kind: 'category', name: 'BLE通信', colour: '#2196F3',
      contents: [
        { kind: 'block', type: 'ble_join_group' },
        { kind: 'sep', gap: '8' },
        { kind: 'block', type: 'ble_send_number', inputs: { VALUE: _num(0) } },
        { kind: 'block', type: 'ble_send_string', inputs: { TEXT: _text('hello') } },
        { kind: 'block', type: 'ble_send_value', inputs: { VALUE: _num(0) } },
        { kind: 'block', type: 'ble_send_list' },
        { kind: 'sep', gap: '8' },
        { kind: 'block', type: 'ble_on_number' },
        { kind: 'block', type: 'ble_on_string' },
        { kind: 'block', type: 'ble_on_value' },
        { kind: 'block', type: 'ble_on_list' },
        { kind: 'sep', gap: '8' },
        { kind: 'block', type: 'ble_received_number' },
        { kind: 'block', type: 'ble_received_string' },
        { kind: 'block', type: 'ble_received_name' },
        { kind: 'block', type: 'ble_received_value' },
        { kind: 'block', type: 'ble_received_list' }
      ]
    }
  ],
  esp32: [
    // ESP32 用カテゴリ（将来追加）
  ]
};

// ── ボードに応じたツールボックスを取得 ──
function getToolboxConfig(boardType) {
  var boardCats = TOOLBOX_BOARD_CATEGORIES[boardType] || TOOLBOX_BOARD_CATEGORIES['pico'];
  // 基本 → ボード別 → 論理・ループ・数学・テキスト・変数・シリアル通信・グラフ
  var contents = [TOOLBOX_SHARED_CATEGORIES[0]]
    .concat(boardCats)
    .concat(TOOLBOX_SHARED_CATEGORIES.slice(1));

  // 有効なプラグインのカテゴリを追加
  if (typeof NestPlugins !== 'undefined') {
    var pluginCats = NestPlugins.getEnabledToolboxCategories(boardType);
    if (pluginCats.length > 0) {
      contents = contents.concat([{ kind: 'sep' }]).concat(pluginCats);
    }
  }

  // 「拡張機能」カテゴリを末尾に追加
  contents.push({ kind: 'sep' });
  contents.push({
    kind: 'category',
    name: '拡張機能',
    colour: '#888888',
    cssConfig: { 'container': 'nb-ext-category' },
    contents: []
  });

  return { kind: 'categoryToolbox', contents: contents };
}

// 後方互換: デフォルトは Pico
var TOOLBOX_CONFIG = getToolboxConfig('pico');
