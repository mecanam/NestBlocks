// ──────────────────────────────
// プラグイン: RoboPad — BLE コントローラー受信
// スマホアプリ RoboPad からジョイスティック・ボタン・スライダーの値を受信
// ──────────────────────────────
NestPlugins.register({
  id: 'robopad',
  name: 'RoboPad',
  description: 'スマホの RoboPad アプリと BLE 接続し、ジョイスティック・ボタン・スライダーの操作を受信します。Pico W 専用。',
  icon: '🎮',
  color: '#FF5722',
  thumbSvg: '<svg viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" rx="8" fill="#FBE9E7"/><rect x="50" y="15" width="140" height="90" rx="16" fill="#37474F"/><rect x="54" y="19" width="132" height="82" rx="13" fill="#455A64"/><circle cx="90" cy="60" r="18" fill="#546E7A"/><circle cx="90" cy="60" r="12" fill="#FF5722"/><circle cx="90" cy="52" r="2" fill="#FFAB91"/><rect x="140" y="42" width="12" height="12" rx="3" fill="#4CAF50"/><rect x="156" y="42" width="12" height="12" rx="3" fill="#F44336"/><rect x="140" y="58" width="12" height="12" rx="3" fill="#2196F3"/><rect x="156" y="58" width="12" height="12" rx="3" fill="#FFC107"/><rect x="70" y="82" width="40" height="6" rx="3" fill="#FF5722" opacity=".6"/><rect x="120" y="82" width="40" height="6" rx="3" fill="#FF5722" opacity=".4"/><circle cx="30" cy="60" r="6" fill="#2196F3" opacity=".5"><animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite"/></circle><path d="M36 60 L50 50" stroke="#2196F3" stroke-width="1.5" stroke-dasharray="3 2" opacity=".4"/></svg>',
  boards: ['pico'],

  initBlocks: function () {

    // ── 初期化 ──
    Blockly.Blocks['robopad_init'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('RoboPad 初期化')
          .appendField('デバイス名')
          .appendField(new Blockly.FieldTextInput('robopad'), 'NAME');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#FF5722');
        this.setTooltip('RoboPad BLE ペリフェラルを起動します。\nレンジ（±127 / 0〜255）は最初のデータから自動検出されます。');
      }
    };

    // ── 接続状態 ──
    Blockly.Blocks['robopad_connected'] = {
      init: function () {
        this.appendDummyInput().appendField('RoboPad 接続中？');
        this.setOutput(true, 'Boolean');
        this.setColour('#FF5722');
        this.setTooltip('スマホが BLE 接続中なら True');
      }
    };

    // ── ジョイスティック X ──
    Blockly.Blocks['robopad_joy_x'] = {
      init: function () {
        this.appendDummyInput().appendField('RoboPad ジョイスティック X');
        this.setOutput(true, 'Number');
        this.setColour('#FF5722');
        this.setTooltip('ジョイスティックの X 値（-128〜127、左:負 / 右:正）');
      }
    };

    // ── ジョイスティック Y ──
    Blockly.Blocks['robopad_joy_y'] = {
      init: function () {
        this.appendDummyInput().appendField('RoboPad ジョイスティック Y');
        this.setOutput(true, 'Number');
        this.setColour('#FF5722');
        this.setTooltip('ジョイスティックの Y 値（-128〜127、下:負 / 上:正）');
      }
    };

    // ── ボタン ──
    Blockly.Blocks['robopad_button'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('RoboPad ボタン')
          .appendField(new Blockly.FieldDropdown([
            ['A', '0'], ['B', '1'], ['X', '2'], ['Y', '3'],
            ['R1', '4'], ['R2', '5'], ['L1', '6'], ['L2', '7']
          ]), 'BIT')
          .appendField('が押されている');
        this.setOutput(true, 'Boolean');
        this.setColour('#FF5722');
        this.setTooltip('指定したボタンが押されていれば True');
      }
    };

    // ── ボタン 生データ ──
    Blockly.Blocks['robopad_buttons_raw'] = {
      init: function () {
        this.appendDummyInput().appendField('RoboPad ボタン生データ');
        this.setOutput(true, 'Number');
        this.setColour('#FF5722');
        this.setTooltip('ボタン状態の8ビット値（ビットフラグ）を返します');
      }
    };

    // ── スライダー ──
    Blockly.Blocks['robopad_slider'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('RoboPad スライダー')
          .appendField(new Blockly.FieldDropdown([
            ['1', '0'], ['2', '1'], ['3', '2'], ['4', '3']
          ]), 'ID')
          .appendField('の値');
        this.setOutput(true, 'Number');
        this.setColour('#FF5722');
        this.setTooltip('スライダーの値（-128〜127）を返します');
      }
    };
  },

  initGenerators: function () {

    // ── RoboPad クラス全体を definitions_ に登録 ──
    function ensureRoboPadClass() {
      Blockly.Python.definitions_['import_robopad'] = [
        'import ubluetooth',
        'import struct'
      ].join('\n');

      Blockly.Python.definitions_['robopad_class'] = [
        'class _RoboPad:',
        '    _IRQ_CONNECT = 1',
        '    _IRQ_DISCONNECT = 2',
        '    _IRQ_WRITE = 3',
        '    _SVC = ubluetooth.UUID("0000ffe0-0000-1000-8000-00805f9b34fb")',
        '    _CHR_JOY = ubluetooth.UUID("0000ffe1-0000-1000-8000-00805f9b34fb")',
        '    _CHR_BTN = ubluetooth.UUID("0000ffe2-0000-1000-8000-00805f9b34fb")',
        '    _CHR_SI8 = ubluetooth.UUID("0000ffe3-0000-1000-8000-00805f9b34fb")',
        '    _CHR_SU8 = ubluetooth.UUID("0000ffe4-0000-1000-8000-00805f9b34fb")',
        '    _WR = ubluetooth.FLAG_WRITE | ubluetooth.FLAG_WRITE_NO_RESPONSE',
        '    def __init__(self, name):',
        '        self.joy_x = 0',
        '        self.joy_y = 0',
        '        self.buttons = 0',
        '        self.sliders = [0, 0, 0, 0]',
        '        self.connected = False',
        '        self._name = name',
        '        self._ble = ubluetooth.BLE()',
        '        self._ble.active(True)',
        '        self._ble.irq(self._irq)',
        '        svc = ((self._SVC, (',
        '            (self._CHR_JOY, self._WR),',
        '            (self._CHR_BTN, self._WR),',
        '            (self._CHR_SI8, self._WR),',
        '            (self._CHR_SU8, self._WR),',
        '        )),)',
        '        ((self._hj, self._hb, self._hsi, self._hsu),) = self._ble.gatts_register_services(svc)',
        '        self._start_adv()',
        '    def _start_adv(self):',
        '        n = bytes(self._name, "utf-8")',
        '        self._ble.gap_advertise(100_000, b"\\x02\\x01\\x06\\x03\\x03\\xe0\\xff" + bytes([len(n)+1, 0x09]) + n)',
        '    def _irq(self, event, data):',
        '        if event == self._IRQ_CONNECT:',
        '            self.connected = True',
        '        elif event == self._IRQ_DISCONNECT:',
        '            self.connected = False',
        '            self._start_adv()',
        '        elif event == self._IRQ_WRITE:',
        '            h = data[1]',
        '            if h == self._hj:',
        '                r = self._ble.gatts_read(self._hj)',
        '                self.joy_x, self.joy_y = struct.unpack("bb", r)',
        '            elif h == self._hb:',
        '                r = self._ble.gatts_read(self._hb)',
        '                self.buttons = struct.unpack("B", r)[0]',
        '            elif h == self._hsi:',
        '                r = self._ble.gatts_read(self._hsi)',
        '                sid, val = struct.unpack("bb", r)',
        '                if 0 <= sid < 4:',
        '                    self.sliders[sid] = val',
        '            elif h == self._hsu:',
        '                r = self._ble.gatts_read(self._hsu)',
        '                sid, val = struct.unpack("bB", r)',
        '                if 0 <= sid < 4:',
        '                    self.sliders[sid] = val'
      ].join('\n');
    }

    // 初期化
    Blockly.Python['robopad_init'] = function (block) {
      var name = block.getFieldValue('NAME');
      ensureRoboPadClass();
      Blockly.Python.definitions_['robopad_instance'] = "robopad = _RoboPad('" + name + "')";
      return '';
    };

    // 接続中？
    Blockly.Python['robopad_connected'] = function (block) {
      return ['robopad.connected', Blockly.Python.ORDER_MEMBER];
    };

    // ジョイスティック X
    Blockly.Python['robopad_joy_x'] = function (block) {
      return ['robopad.joy_x', Blockly.Python.ORDER_MEMBER];
    };

    // ジョイスティック Y
    Blockly.Python['robopad_joy_y'] = function (block) {
      return ['robopad.joy_y', Blockly.Python.ORDER_MEMBER];
    };

    // ボタン（個別）
    Blockly.Python['robopad_button'] = function (block) {
      var bit = block.getFieldValue('BIT');
      return ['bool(robopad.buttons & (1 << ' + bit + '))', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    // ボタン（生データ）
    Blockly.Python['robopad_buttons_raw'] = function (block) {
      return ['robopad.buttons', Blockly.Python.ORDER_MEMBER];
    };

    // スライダー
    Blockly.Python['robopad_slider'] = function (block) {
      var id = block.getFieldValue('ID');
      return ['robopad.sliders[' + id + ']', Blockly.Python.ORDER_MEMBER];
    };
  },

  toolbox: {
    kind: 'category', name: 'RoboPad', colour: '#FF5722',
    contents: [
      { kind: 'block', type: 'robopad_init' },
      { kind: 'block', type: 'robopad_connected' },
      { kind: 'sep', gap: '12' },
      { kind: 'label', text: 'ジョイスティック' },
      { kind: 'block', type: 'robopad_joy_x' },
      { kind: 'block', type: 'robopad_joy_y' },
      { kind: 'sep', gap: '12' },
      { kind: 'label', text: 'ボタン' },
      { kind: 'block', type: 'robopad_button' },
      { kind: 'block', type: 'robopad_buttons_raw' },
      { kind: 'sep', gap: '12' },
      { kind: 'label', text: 'スライダー' },
      { kind: 'block', type: 'robopad_slider' }
    ]
  }
});
