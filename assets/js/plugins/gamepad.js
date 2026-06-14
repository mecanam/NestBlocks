// ──────────────────────────────
// プラグイン: GamePad — 専用基板コントローラー
// ボタン 12 個 (btn_1A〜btn_6B) ＋ アナログジョイスティック (X:GP26, Y:GP27)
// インジケーター LED (GP10) — 無線接続確認用
// ──────────────────────────────
NestPlugins.register({
  id: 'gamepad',
  name: 'GamePad',
  description: 'ボタン12個＋ジョイスティック搭載の専用コントローラー基板。ピン配置は固定です。',
  icon: '🕹️',
  color: '#7C4DFF',
  thumbSvg: '<svg viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" rx="8" fill="#EDE7F6"/><rect x="40" y="20" width="160" height="80" rx="18" fill="#37474F"/><rect x="44" y="24" width="152" height="72" rx="15" fill="#455A64"/><circle cx="95" cy="60" r="20" fill="#546E7A"/><circle cx="95" cy="60" r="13" fill="#7C4DFF"/><circle cx="95" cy="53" r="2.5" fill="#B388FF"/><rect x="145" y="42" width="14" height="14" rx="7" fill="#4CAF50"/><rect x="163" y="42" width="14" height="14" rx="7" fill="#F44336"/><rect x="145" y="60" width="14" height="14" rx="7" fill="#2196F3"/><rect x="163" y="60" width="14" height="14" rx="7" fill="#FFC107"/><rect x="70" y="85" width="36" height="5" rx="2.5" fill="#7C4DFF" opacity=".5"/><rect x="130" y="85" width="36" height="5" rx="2.5" fill="#7C4DFF" opacity=".3"/></svg>',
  boards: ['pico'],

  // ── 固定ピンマッピング ──
  _btnPins: {
    '1': 2, '2': 3,
    '3': 4, '4': 5,
    '5': 6, '6': 7,
    '7': 11, '8': 9,
    '9': 8, '10': 12,
    '11': 13, '12': 14
  },
  _indicatorPin: 10,
  _joyPinX: 26,
  _joyPinY: 27,

  initBlocks: function () {

    // ── 全ボタン・ジョイスティック一括で初期化 ──
    Blockly.Blocks['gamepad_init'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('GamePad 初期化');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#7C4DFF');
        this.setTooltip('コントローラー基板を初期化します\nボタン12個 (1A〜6B) + ジョイスティック (GP26/GP27) + インジケーター (GP10)');
      }
    };

    // ── ボタンドロップダウン (12個) ──
    var BTN_OPTIONS = [
      ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'],
      ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'],
      ['9', '9'], ['10', '10'], ['11', '11'], ['12', '12']
    ];

    // ── ボタンが押されている ──
    Blockly.Blocks['gamepad_btn'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('ボタン')
          .appendField(new Blockly.FieldDropdown(BTN_OPTIONS), 'BTN')
          .appendField('が押されている');
        this.setOutput(true, 'Boolean');
        this.setColour('#7C4DFF');
        this.setTooltip('指定したボタンが押されていれば True');
      }
    };

    // ── いずれかのボタンが押されている ──
    Blockly.Blocks['gamepad_any_btn'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('いずれかのボタンが押されている');
        this.setOutput(true, 'Boolean');
        this.setColour('#7C4DFF');
        this.setTooltip('12個のボタンのうち1つでも押されていれば True');
      }
    };

    // ── ジョイスティック X 値 ──
    Blockly.Blocks['gamepad_joy_x'] = {
      init: function () {
        this.appendDummyInput().appendField('ジョイスティック X');
        this.setOutput(true, 'Number');
        this.setColour('#7C4DFF');
        this.setTooltip('ジョイスティックの X 値（-100〜100、左:負 / 右:正）');
      }
    };

    // ── ジョイスティック Y 値 ──
    Blockly.Blocks['gamepad_joy_y'] = {
      init: function () {
        this.appendDummyInput().appendField('ジョイスティック Y');
        this.setOutput(true, 'Number');
        this.setColour('#7C4DFF');
        this.setTooltip('ジョイスティックの Y 値（-100〜100、下:負 / 上:正）');
      }
    };

    // ── 方向判定 ──
    Blockly.Blocks['gamepad_direction'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('ジョイスティックの方向が')
          .appendField(new Blockly.FieldDropdown([
            ['上', 'UP'],
            ['下', 'DOWN'],
            ['左', 'LEFT'],
            ['右', 'RIGHT'],
            ['中央', 'CENTER']
          ]), 'DIR');
        this.setOutput(true, 'Boolean');
        this.setColour('#7C4DFF');
        this.setTooltip('ジョイスティックが指定した方向に倒されていれば True（しきい値: 30）');
      }
    };

    // ── インジケーター LED ──
    Blockly.Blocks['gamepad_indicator'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('インジケーターを')
          .appendField(new Blockly.FieldDropdown([
            ['点灯(ON)', '1'],
            ['消灯(OFF)', '0']
          ]), 'STATE')
          .appendField('にする');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#7C4DFF');
        this.setTooltip('GP10 の接続確認用インジケーター LED を制御します');
      }
    };
  },

  initGenerators: function () {

    // ── ヘルパークラスを definitions_ に登録 ──
    function ensureGamePadClass() {
      Blockly.Python.definitions_['import_gamepad'] = 'from machine import Pin, ADC\nimport json';

      Blockly.Python.definitions_['gamepad_class'] = [
        'class _GamePad:',
        '    _PINS = {',
        "        '1': 2, '2': 3, '3': 4, '4': 5,",
        "        '5': 6, '6': 7, '7': 11, '8': 9,",
        "        '9': 8, '10': 12, '11': 13, '12': 14",
        '    }',
        '    def __init__(self):',
        '        self._btns = {}',
        '        for name, pin in self._PINS.items():',
        '            self._btns[name] = Pin(pin, Pin.IN, Pin.PULL_DOWN)',
        '        self._joy_x = ADC(Pin(26))',
        '        self._joy_y = ADC(Pin(27))',
        '        self._led = Pin(10, Pin.OUT)',
        '        self._led.value(0)',
        '        self._cx = 32768',
        '        self._cy = 32768',
        '        try:',
        "            f = open('gp_cal.json', 'r')",
        '            cal = json.load(f)',
        '            f.close()',
        "            self._cx = cal.get('cx', 32768)",
        "            self._cy = cal.get('cy', 32768)",
        '        except:',
        '            pass',
        '    def btn(self, name):',
        '        p = self._btns.get(name)',
        '        return (p.value() == 1) if p else False',
        '    def any_btn(self):',
        '        for p in self._btns.values():',
        '            if p.value() == 1:',
        '                return True',
        '        return False',
        '    def joy_val(self, axis):',
        '        adc = self._joy_x if axis == 0 else self._joy_y',
        '        center = self._cx if axis == 0 else self._cy',
        '        raw = adc.read_u16()',
        '        sign = -1 if axis == 0 else 1',
        '        v = int((raw - center) * 100 / 32768) * sign',
        '        v = max(-100, min(100, v))',
        '        if -5 < v < 5:',
        '            v = 0',
        '        return v',
        '    def direction(self, d):',
        '        x = self.joy_val(0)',
        '        y = self.joy_val(1)',
        '        if d == 0:',
        '            return y > 30',
        '        elif d == 1:',
        '            return y < -30',
        '        elif d == 2:',
        '            return x < -30',
        '        elif d == 3:',
        '            return x > 30',
        '        else:',
        '            return -30 <= x <= 30 and -30 <= y <= 30',
        '    def indicator(self, state):',
        '        self._led.value(state)'
      ].join('\n');
    }

    function ensureInstance() {
      ensureGamePadClass();
      Blockly.Python.definitions_['gamepad_instance'] = '_gp = _GamePad()';
    }

    // 初期化
    Blockly.Python['gamepad_init'] = function () {
      ensureInstance();
      return '';
    };

    // ボタン
    Blockly.Python['gamepad_btn'] = function (block) {
      var btn = block.getFieldValue('BTN');
      ensureInstance();
      return ["_gp.btn('" + btn + "')", Blockly.Python.ORDER_FUNCTION_CALL];
    };

    // いずれかのボタン
    Blockly.Python['gamepad_any_btn'] = function () {
      ensureInstance();
      return ['_gp.any_btn()', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    // ジョイスティック X
    Blockly.Python['gamepad_joy_x'] = function () {
      ensureInstance();
      return ['_gp.joy_val(0)', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    // ジョイスティック Y
    Blockly.Python['gamepad_joy_y'] = function () {
      ensureInstance();
      return ['_gp.joy_val(1)', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    // 方向判定
    Blockly.Python['gamepad_direction'] = function (block) {
      var dir = block.getFieldValue('DIR');
      var dirMap = { 'UP': '0', 'DOWN': '1', 'LEFT': '2', 'RIGHT': '3', 'CENTER': '4' };
      ensureInstance();
      return ['_gp.direction(' + dirMap[dir] + ')', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    // インジケーター
    Blockly.Python['gamepad_indicator'] = function (block) {
      var state = block.getFieldValue('STATE');
      ensureInstance();
      return '_gp.indicator(' + state + ')\n';
    };
  },

  toolbox: {
    kind: 'category', name: 'GamePad', colour: '#7C4DFF',
    contents: [
      { kind: 'block', type: 'gamepad_init' },
      { kind: 'sep', gap: '16' },
      { kind: 'label', text: 'ボタン' },
      { kind: 'block', type: 'gamepad_btn' },
      { kind: 'block', type: 'gamepad_any_btn' },
      { kind: 'sep', gap: '16' },
      { kind: 'label', text: 'ジョイスティック' },
      { kind: 'block', type: 'gamepad_joy_x' },
      { kind: 'block', type: 'gamepad_joy_y' },
      { kind: 'block', type: 'gamepad_direction' },
      { kind: 'sep', gap: '16' },
      { kind: 'label', text: 'インジケーター' },
      { kind: 'block', type: 'gamepad_indicator' }
    ]
  }
});
