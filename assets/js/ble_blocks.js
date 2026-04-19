// ──────────────────────────────
// BLE通信 ブロック定義 + Python生成
// Pico W 同士の BLE ブロードキャスト通信
// ──────────────────────────────

var BLE_COLOUR = '#2196F3';

// ── BLE初期化ヘルパー（ble_join_group 未使用時のフォールバック）──
function ensureBleSetup() {
  Blockly.Python.definitions_['import_piconest_ble'] = 'from piconest_ble import PicoNestBroadcast';
  if (!Blockly.Python.definitions_['ble_setup']) {
    Blockly.Python.definitions_['ble_setup'] = "ble = PicoNestBroadcast('default')";
  }
}


// ══════════════════════════════════════════════════════
// セットアップ
// ══════════════════════════════════════════════════════

Blockly.Blocks['ble_join_group'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('BLEグループ')
        .appendField(new Blockly.FieldTextInput('group1'), 'GROUP')
        .appendField('に参加');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOUR);
    this.setTooltip('BLE通信のグループに参加します\n同じグループ名のPico同士だけが通信できます');
  }
};

Blockly.Python['ble_join_group'] = function(block) {
  var group = block.getFieldValue('GROUP');
  Blockly.Python.definitions_['import_piconest_ble'] = 'from piconest_ble import PicoNestBroadcast';
  Blockly.Python.definitions_['ble_setup'] = "ble = PicoNestBroadcast('" + group + "')";
  return '';
};


// ══════════════════════════════════════════════════════
// 送信
// ══════════════════════════════════════════════════════

// 数字を送信
Blockly.Blocks['ble_send_number'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('BLE 数字');
    this.appendDummyInput()
        .appendField('を送信');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOUR);
    this.setTooltip('数字をBLEで送信します（-32768〜32767）');
  }
};

Blockly.Python['ble_send_number'] = function(block) {
  ensureBleSetup();
  var value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
  return 'ble.send_number(' + value + ')\n';
};

// 文字列を送信
Blockly.Blocks['ble_send_string'] = {
  init: function() {
    this.appendValueInput('TEXT')
        .setCheck('String')
        .appendField('BLE 文字列');
    this.appendDummyInput()
        .appendField('を送信');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOUR);
    this.setTooltip('文字列をBLEで送信します（最大18バイト）');
  }
};

Blockly.Python['ble_send_string'] = function(block) {
  ensureBleSetup();
  var text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_NONE) || "''";
  return 'ble.send_string(' + text + ')\n';
};

// 名前と値を送信
Blockly.Blocks['ble_send_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('BLE 名前')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME');
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('値');
    this.appendDummyInput()
        .appendField('を送信');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BLE_COLOUR);
    this.setTooltip('名前付きの数値をBLEで送信します');
  }
};

Blockly.Python['ble_send_value'] = function(block) {
  ensureBleSetup();
  var name = block.getFieldValue('NAME');
  var value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
  return "ble.send_value('" + name + "', " + value + ')\n';
};


// ══════════════════════════════════════════════════════
// 受信イベント（トップレベル ハットブロック）
// ══════════════════════════════════════════════════════

// 数字を受信したとき
Blockly.Blocks['ble_on_number'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('BLE 数字を受信したとき');
    this.appendStatementInput('DO');
    this.setColour(BLE_COLOUR);
    this.setTooltip('BLEで数字を受信したときに実行します\n「受信した数字」ブロックで値を取得できます');
  }
};

Blockly.Python['ble_on_number'] = function(block) {
  ensureBleSetup();
  var body = Blockly.Python.statementToCode(block, 'DO') || '  pass\n';
  return '@ble.on_number\ndef _on_number(_ble_val):\n' + body + '\n';
};

// 文字列を受信したとき
Blockly.Blocks['ble_on_string'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('BLE 文字列を受信したとき');
    this.appendStatementInput('DO');
    this.setColour(BLE_COLOUR);
    this.setTooltip('BLEで文字列を受信したときに実行します\n「受信した文字列」ブロックで値を取得できます');
  }
};

Blockly.Python['ble_on_string'] = function(block) {
  ensureBleSetup();
  var body = Blockly.Python.statementToCode(block, 'DO') || '  pass\n';
  return '@ble.on_string\ndef _on_string(_ble_text):\n' + body + '\n';
};

// 名前と値を受信したとき
Blockly.Blocks['ble_on_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('BLE 名前と値を受信したとき');
    this.appendStatementInput('DO');
    this.setColour(BLE_COLOUR);
    this.setTooltip('BLEで名前付き数値を受信したときに実行します\n「受信した名前」「受信した値」ブロックで取得できます');
  }
};

Blockly.Python['ble_on_value'] = function(block) {
  ensureBleSetup();
  var body = Blockly.Python.statementToCode(block, 'DO') || '  pass\n';
  return '@ble.on_value\ndef _on_value(_ble_name, _ble_val):\n' + body + '\n';
};


// ══════════════════════════════════════════════════════
// 受信した値（値ブロック — 受信イベント内で使用）
// ══════════════════════════════════════════════════════

Blockly.Blocks['ble_received_number'] = {
  init: function() {
    this.appendDummyInput().appendField('受信した数字');
    this.setOutput(true, 'Number');
    this.setColour(BLE_COLOUR);
    this.setTooltip('「数字を受信したとき」内で使用');
  }
};

Blockly.Python['ble_received_number'] = function(block) {
  return ['_ble_val', Blockly.Python.ORDER_ATOMIC];
};

Blockly.Blocks['ble_received_string'] = {
  init: function() {
    this.appendDummyInput().appendField('受信した文字列');
    this.setOutput(true, 'String');
    this.setColour(BLE_COLOUR);
    this.setTooltip('「文字列を受信したとき」内で使用');
  }
};

Blockly.Python['ble_received_string'] = function(block) {
  return ['_ble_text', Blockly.Python.ORDER_ATOMIC];
};

Blockly.Blocks['ble_received_name'] = {
  init: function() {
    this.appendDummyInput().appendField('受信した名前');
    this.setOutput(true, 'String');
    this.setColour(BLE_COLOUR);
    this.setTooltip('「名前と値を受信したとき」内で使用');
  }
};

Blockly.Python['ble_received_name'] = function(block) {
  return ['_ble_name', Blockly.Python.ORDER_ATOMIC];
};

Blockly.Blocks['ble_received_value'] = {
  init: function() {
    this.appendDummyInput().appendField('受信した値');
    this.setOutput(true, 'Number');
    this.setColour(BLE_COLOUR);
    this.setTooltip('「名前と値を受信したとき」内で使用');
  }
};

Blockly.Python['ble_received_value'] = function(block) {
  return ['_ble_val', Blockly.Python.ORDER_ATOMIC];
};
