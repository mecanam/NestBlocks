// ──────────────────────────────
// プラグイン: HC-SR04 超音波距離センサー
// ──────────────────────────────
NestPlugins.register({
  id: 'hcsr04',
  name: 'HC-SR04 超音波センサー',
  description: '超音波で距離を測定する定番のセンサーモジュール。Trig/Echo の2ピンで最大4mまで計測可能。',
  icon: '📡',
  color: '#2196F3',
  thumbSvg: '<svg viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" rx="8" fill="#E3F2FD"/><rect x="50" y="20" width="140" height="80" rx="6" fill="#1565C0"/><rect x="54" y="24" width="132" height="72" rx="4" fill="#1976D2"/><circle cx="90" cy="60" r="22" fill="#B0BEC5" stroke="#90A4AE" stroke-width="2"/><circle cx="90" cy="60" r="16" fill="#CFD8DC"/><circle cx="90" cy="60" r="6" fill="#78909C"/><circle cx="150" cy="60" r="22" fill="#B0BEC5" stroke="#90A4AE" stroke-width="2"/><circle cx="150" cy="60" r="16" fill="#CFD8DC"/><circle cx="150" cy="60" r="6" fill="#78909C"/><rect x="62" y="82" width="8" height="12" rx="1" fill="#FFC107"/><rect x="78" y="82" width="8" height="12" rx="1" fill="#FFC107"/><rect x="154" y="82" width="8" height="12" rx="1" fill="#FFC107"/><rect x="170" y="82" width="8" height="12" rx="1" fill="#FFC107"/><rect x="56" y="26" width="24" height="6" rx="2" fill="#42A5F5" opacity=".6"/></svg>',
  boards: ['pico'],

  // ── ブロック定義 ──
  initBlocks: function () {
    Blockly.Blocks['hcsr04_read'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('超音波センサー')
          .appendField(' Trig')
          .appendField(new Blockly.FieldDropdown([
            ['GP0', '0'], ['GP1', '1'], ['GP2', '2'], ['GP3', '3'],
            ['GP4', '4'], ['GP5', '5'], ['GP6', '6'], ['GP7', '7'],
            ['GP8', '8'], ['GP9', '9'], ['GP10', '10'], ['GP11', '11'],
            ['GP12', '12'], ['GP13', '13'], ['GP14', '14'], ['GP15', '15'],
            ['GP16', '16'], ['GP17', '17'], ['GP18', '18'], ['GP19', '19'],
            ['GP20', '20'], ['GP21', '21'], ['GP22', '22'],
            ['GP26', '26'], ['GP27', '27'], ['GP28', '28']
          ]), 'TRIG')
          .appendField(' Echo')
          .appendField(new Blockly.FieldDropdown([
            ['GP0', '0'], ['GP1', '1'], ['GP2', '2'], ['GP3', '3'],
            ['GP4', '4'], ['GP5', '5'], ['GP6', '6'], ['GP7', '7'],
            ['GP8', '8'], ['GP9', '9'], ['GP10', '10'], ['GP11', '11'],
            ['GP12', '12'], ['GP13', '13'], ['GP14', '14'], ['GP15', '15'],
            ['GP16', '16'], ['GP17', '17'], ['GP18', '18'], ['GP19', '19'],
            ['GP20', '20'], ['GP21', '21'], ['GP22', '22'],
            ['GP26', '26'], ['GP27', '27'], ['GP28', '28']
          ]), 'ECHO')
          .appendField(' 距離(cm)');
        this.setOutput(true, 'Number');
        this.setColour('#2196F3');
        this.setTooltip('HC-SR04 超音波センサーで距離を測定します（cm）');
      }
    };
  },

  // ── Python コード生成 ──
  initGenerators: function () {
    Blockly.Python['hcsr04_read'] = function (block) {
      var trig = block.getFieldValue('TRIG');
      var echo = block.getFieldValue('ECHO');

      // import を追加
      Blockly.Python.provideFunction_('hcsr04_measure', [
        'import machine',
        'import utime',
        '',
        'def hcsr04_measure(trig_pin, echo_pin):',
        '    trig = machine.Pin(trig_pin, machine.Pin.OUT)',
        '    echo = machine.Pin(echo_pin, machine.Pin.IN)',
        '    trig.low()',
        '    utime.sleep_us(2)',
        '    trig.high()',
        '    utime.sleep_us(10)',
        '    trig.low()',
        '    timeout = utime.ticks_us() + 30000',
        '    while echo.value() == 0:',
        '        if utime.ticks_us() > timeout:',
        '            return -1',
        '        start = utime.ticks_us()',
        '    while echo.value() == 1:',
        '        if utime.ticks_us() > timeout:',
        '            return -1',
        '        end = utime.ticks_us()',
        '    duration = utime.ticks_diff(end, start)',
        '    distance = duration * 0.0343 / 2',
        '    return round(distance, 1)'
      ]);

      var code = 'hcsr04_measure(' + trig + ', ' + echo + ')';
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    };
  },

  // ── ツールボックスカテゴリ ──
  toolbox: {
    kind: 'category',
    name: 'HC-SR04',
    colour: '#2196F3',
    contents: [
      { kind: 'block', type: 'hcsr04_read' }
    ]
  }
});
