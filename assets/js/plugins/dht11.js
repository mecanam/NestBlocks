// ──────────────────────────────
// プラグイン: DHT11 温湿度センサー
// ──────────────────────────────
NestPlugins.register({
  id: 'dht11',
  name: 'DHT11 温湿度センサー',
  description: '温度と湿度をデジタルで取得できる低コストセンサー。MicroPython の dht モジュールで簡単に使用可能。',
  icon: '🌡️',
  color: '#4CAF50',
  thumbSvg: '<svg viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" rx="8" fill="#E8F5E9"/><rect x="70" y="10" width="100" height="85" rx="6" fill="#1B5E20"/><rect x="74" y="14" width="92" height="77" rx="4" fill="#2E7D32"/><rect x="82" y="20" width="76" height="50" rx="4" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1.5"/><rect x="90" y="28" width="60" height="34" rx="2" fill="#F5F5F5"/><rect x="96" y="34" width="20" height="4" rx="1" fill="#4CAF50"/><rect x="96" y="42" width="14" height="4" rx="1" fill="#81C784"/><rect x="96" y="50" width="24" height="4" rx="1" fill="#A5D6A7"/><rect x="90" y="100" width="6" height="14" rx="1" fill="#FFC107"/><rect x="104" y="100" width="6" height="14" rx="1" fill="#FFC107"/><rect x="118" y="100" width="6" height="14" rx="1" fill="#FFC107"/><circle cx="148" cy="40" r="3" fill="#F44336"/><circle cx="148" cy="52" r="3" fill="#2196F3"/></svg>',
  boards: ['pico'],

  // ── ブロック定義 ──
  initBlocks: function () {
    Blockly.Blocks['dht11_read_temp'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('DHT11 温度(℃)')
          .appendField(' ピン')
          .appendField(new Blockly.FieldDropdown([
            ['GP0', '0'], ['GP1', '1'], ['GP2', '2'], ['GP3', '3'],
            ['GP4', '4'], ['GP5', '5'], ['GP6', '6'], ['GP7', '7'],
            ['GP8', '8'], ['GP9', '9'], ['GP10', '10'], ['GP11', '11'],
            ['GP12', '12'], ['GP13', '13'], ['GP14', '14'], ['GP15', '15'],
            ['GP16', '16'], ['GP17', '17'], ['GP18', '18'], ['GP19', '19'],
            ['GP20', '20'], ['GP21', '21'], ['GP22', '22'],
            ['GP26', '26'], ['GP27', '27'], ['GP28', '28']
          ]), 'PIN');
        this.setOutput(true, 'Number');
        this.setColour('#4CAF50');
        this.setTooltip('DHT11 センサーで温度を取得します（℃）');
      }
    };

    Blockly.Blocks['dht11_read_humidity'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('DHT11 湿度(%)')
          .appendField(' ピン')
          .appendField(new Blockly.FieldDropdown([
            ['GP0', '0'], ['GP1', '1'], ['GP2', '2'], ['GP3', '3'],
            ['GP4', '4'], ['GP5', '5'], ['GP6', '6'], ['GP7', '7'],
            ['GP8', '8'], ['GP9', '9'], ['GP10', '10'], ['GP11', '11'],
            ['GP12', '12'], ['GP13', '13'], ['GP14', '14'], ['GP15', '15'],
            ['GP16', '16'], ['GP17', '17'], ['GP18', '18'], ['GP19', '19'],
            ['GP20', '20'], ['GP21', '21'], ['GP22', '22'],
            ['GP26', '26'], ['GP27', '27'], ['GP28', '28']
          ]), 'PIN');
        this.setOutput(true, 'Number');
        this.setColour('#4CAF50');
        this.setTooltip('DHT11 センサーで湿度を取得します（%）');
      }
    };
  },

  // ── Python コード生成 ──
  initGenerators: function () {
    Blockly.Python['dht11_read_temp'] = function (block) {
      var pin = block.getFieldValue('PIN');

      Blockly.Python.provideFunction_('dht11_setup', [
        'import dht',
        'import machine'
      ]);

      var code = '(lambda: (lambda s: (s.measure(), s.temperature())[1])(dht.DHT11(machine.Pin(' + pin + '))))()';
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    };

    Blockly.Python['dht11_read_humidity'] = function (block) {
      var pin = block.getFieldValue('PIN');

      Blockly.Python.provideFunction_('dht11_setup', [
        'import dht',
        'import machine'
      ]);

      var code = '(lambda: (lambda s: (s.measure(), s.humidity())[1])(dht.DHT11(machine.Pin(' + pin + '))))()';
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    };
  },

  // ── ツールボックスカテゴリ ──
  toolbox: {
    kind: 'category',
    name: 'DHT11',
    colour: '#4CAF50',
    contents: [
      { kind: 'block', type: 'dht11_read_temp' },
      { kind: 'block', type: 'dht11_read_humidity' }
    ]
  }
});
