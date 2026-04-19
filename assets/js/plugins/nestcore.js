// ──────────────────────────────
// プラグイン: PicoNest 拡張ボード
// DCモーター（BD6211F-E2 ×4）・サーボモーター ×4・OLED（SSD1306 I2C）・アナログ入力
// ──────────────────────────────
NestPlugins.register({
  id: 'nestcore',
  name: 'PicoNest',
  description: 'Raspberry Pi Pico 用拡張ボード。DCモーター×4、サーボ×4、OLED ディスプレイ、アナログ入力に対応。',
  icon: '🔧',
  color: '#E8724A',
  thumbSvg: '<svg viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" rx="8" fill="#FBE9E7"/><rect x="30" y="15" width="180" height="90" rx="6" fill="#1B5E20"/><rect x="34" y="19" width="172" height="82" rx="4" fill="#2E7D32"/><rect x="42" y="25" width="28" height="20" rx="3" fill="#37474F"/><rect x="44" y="27" width="24" height="16" rx="2" fill="#455A64"/><text x="56" y="38" text-anchor="middle" font-family="monospace" font-size="6" fill="#90CAF9">OLED</text><rect x="42" y="52" width="14" height="10" rx="2" fill="#E8724A"/><rect x="60" y="52" width="14" height="10" rx="2" fill="#E8724A"/><rect x="78" y="52" width="14" height="10" rx="2" fill="#E8724A"/><rect x="96" y="52" width="14" height="10" rx="2" fill="#E8724A"/><text x="75" y="75" text-anchor="middle" font-family="monospace" font-size="5" fill="#A5D6A7">MOTOR 1-4</text><rect x="130" y="28" width="10" height="50" rx="2" fill="#FF9800"/><rect x="145" y="28" width="10" height="50" rx="2" fill="#FF9800"/><rect x="160" y="28" width="10" height="50" rx="2" fill="#FF9800"/><rect x="175" y="28" width="10" height="50" rx="2" fill="#FF9800"/><text x="157" y="90" text-anchor="middle" font-family="monospace" font-size="5" fill="#A5D6A7">SERVO 1-4</text><rect x="80" y="10" width="20" height="10" rx="2" fill="#B0BEC5"/><rect x="82" y="11.5" width="16" height="7" rx="1" fill="#90A4AE"/><circle cx="195" cy="35" r="4" fill="#4DB86A"/><circle cx="195" cy="48" r="4" fill="#F0B429"/></svg>',
  boards: ['pico'],

  // ── ピンマッピング ──
  _motorPins: {
    '1': { fin: 2, rin: 3 },
    '2': { fin: 4, rin: 5 },
    '3': { fin: 6, rin: 7 },
    '4': { fin: 8, rin: 9 }
  },
  _servoPins: { '1': 10, '2': 11, '3': 12, '4': 13 },

  // ── ブロック定義 ──
  initBlocks: function () {
    var self = this;

    // DCモーター制御
    Blockly.Blocks['dc_motor'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('DCモーター')
          .appendField(new Blockly.FieldDropdown([
            ['モーター1', '1'], ['モーター2', '2'],
            ['モーター3', '3'], ['モーター4', '4']
          ]), 'MOTOR')
          .appendField(new Blockly.FieldDropdown([
            ['正転', 'FORWARD'], ['逆転', 'REVERSE'], ['ブレーキ', 'STOP']
          ]), 'DIRECTION');
        this.appendValueInput('SPEED').setCheck('Number').appendField('速度(%)');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#E8724A');
        this.setTooltip('DCモーターを制御します（BD6211F-E2ドライバー）\n速度: 0〜100%');
      }
    };

    // サーボモーター角度設定
    Blockly.Blocks['servo_set_angle'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('サーボ')
          .appendField(new Blockly.FieldDropdown([
            ['サーボ1', '1'], ['サーボ2', '2'],
            ['サーボ3', '3'], ['サーボ4', '4']
          ]), 'SERVO');
        this.appendValueInput('ANGLE').setCheck('Number').appendField('角度');
        this.appendDummyInput().appendField('°');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#E8724A');
        this.setTooltip('サーボモーターの角度を設定します（0〜180°）');
      }
    };

    // OLED テキスト
    Blockly.Blocks['oled_text'] = {
      init: function () {
        this.appendValueInput('TEXT').setCheck(null).appendField('OLED テキスト');
        this.appendValueInput('X').setCheck('Number').appendField('x');
        this.appendValueInput('Y').setCheck('Number').appendField('y');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null); this.setNextStatement(true, null);
        this.setColour('#5BA0E0');
        this.setTooltip('OLEDにテキストを描画します');
      }
    };

    // OLED 更新
    Blockly.Blocks['oled_show'] = {
      init: function () {
        this.appendDummyInput().appendField('OLED 更新');
        this.setPreviousStatement(true, null); this.setNextStatement(true, null);
        this.setColour('#5BA0E0');
      }
    };

    // OLED クリア
    Blockly.Blocks['oled_clear'] = {
      init: function () {
        this.appendDummyInput().appendField('OLED クリア');
        this.setPreviousStatement(true, null); this.setNextStatement(true, null);
        this.setColour('#5BA0E0');
      }
    };

    // OLED ピクセル
    Blockly.Blocks['oled_pixel'] = {
      init: function () {
        this.appendValueInput('X').setCheck('Number').appendField('OLED ピクセル x');
        this.appendValueInput('Y').setCheck('Number').appendField('y');
        this.appendDummyInput().appendField(new Blockly.FieldDropdown([['白', '1'], ['黒', '0']]), 'COLOR');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null); this.setNextStatement(true, null);
        this.setColour('#5BA0E0');
      }
    };

    // OLED 直線
    Blockly.Blocks['oled_line'] = {
      init: function () {
        this.appendValueInput('X1').setCheck('Number').appendField('OLED 線 x1');
        this.appendValueInput('Y1').setCheck('Number').appendField('y1');
        this.appendValueInput('X2').setCheck('Number').appendField('x2');
        this.appendValueInput('Y2').setCheck('Number').appendField('y2');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null); this.setNextStatement(true, null);
        this.setColour('#5BA0E0');
      }
    };

    // OLED 四角形
    Blockly.Blocks['oled_rect'] = {
      init: function () {
        this.appendValueInput('X').setCheck('Number').appendField('OLED 四角 x');
        this.appendValueInput('Y').setCheck('Number').appendField('y');
        this.appendValueInput('W').setCheck('Number').appendField('幅');
        this.appendValueInput('H').setCheck('Number').appendField('高さ');
        this.appendDummyInput().appendField(new Blockly.FieldDropdown([['枠のみ', 'OUTLINE'], ['塗りつぶし', 'FILL']]), 'STYLE');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null); this.setNextStatement(true, null);
        this.setColour('#5BA0E0');
      }
    };

    // アナログ入力
    Blockly.Blocks['nestcore_analog_read'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('アナログ入力')
          .appendField(new Blockly.FieldDropdown([
            ['ADC_0 (J6)', '26'], ['ADC_1 (J7)', '27'], ['ADC_2 (J8)', '28']
          ]), 'PIN');
        this.setOutput(true, 'Number');
        this.setColour('#5BA0E0');
        this.setTooltip('アナログ入力値を読み取ります（0〜65535）');
      }
    };

    // ── UART ブロック（GPIO0=TX, GPIO1=RX, J20） ──

    // UART 送信
    Blockly.Blocks['nestcore_uart_write'] = {
      init: function () {
        this.appendValueInput('DATA').setCheck(null).appendField('UART 送信');
        this.appendDummyInput()
          .appendField('ボーレート')
          .appendField(new Blockly.FieldDropdown([
            ['9600', '9600'], ['115200', '115200'], ['19200', '19200'], ['38400', '38400']
          ]), 'BAUD');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#26A69A');
        this.setTooltip('UART (J20) でデータを送信します\nTX=GPIO0, RX=GPIO1');
      }
    };

    // UART 受信（1行読み取り）
    Blockly.Blocks['nestcore_uart_readline'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('UART 1行受信')
          .appendField('ボーレート')
          .appendField(new Blockly.FieldDropdown([
            ['9600', '9600'], ['115200', '115200'], ['19200', '19200'], ['38400', '38400']
          ]), 'BAUD');
        this.setOutput(true, 'String');
        this.setColour('#26A69A');
        this.setTooltip('UART (J20) から1行読み取ります\nデータがない場合は空文字を返します');
      }
    };

    // UART データあり？
    Blockly.Blocks['nestcore_uart_any'] = {
      init: function () {
        this.appendDummyInput().appendField('UART データあり？');
        this.setOutput(true, 'Boolean');
        this.setColour('#26A69A');
        this.setTooltip('UART バッファにデータがあれば True');
      }
    };

    // ── I2C ブロック（GPIO20=SDA, GPIO21=SCL, J4/J5） ──

    // I2C スキャン
    Blockly.Blocks['nestcore_i2c_scan'] = {
      init: function () {
        this.appendDummyInput().appendField('I2C デバイスをスキャン');
        this.setOutput(true, 'Array');
        this.setColour('#7E57C2');
        this.setTooltip('I2C バス (J4/J5) に接続されたデバイスのアドレス一覧を返します\nSDA=GPIO20, SCL=GPIO21');
      }
    };

    // I2C 読み取り
    Blockly.Blocks['nestcore_i2c_read'] = {
      init: function () {
        this.appendValueInput('ADDR').setCheck('Number').appendField('I2C 読取 アドレス');
        this.appendValueInput('NBYTES').setCheck('Number').appendField('バイト数');
        this.setInputsInline(true);
        this.setOutput(true, null);
        this.setColour('#7E57C2');
        this.setTooltip('I2C デバイスからデータを読み取ります');
      }
    };

    // I2C 書き込み
    Blockly.Blocks['nestcore_i2c_write'] = {
      init: function () {
        this.appendValueInput('ADDR').setCheck('Number').appendField('I2C 書込 アドレス');
        this.appendValueInput('DATA').setCheck(null).appendField('データ');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#7E57C2');
        this.setTooltip('I2C デバイスにデータを書き込みます');
      }
    };
  },

  // ── Python コード生成 ──
  initGenerators: function () {
    var motorPins = this._motorPins;
    var servoPins = this._servoPins;

    function ensureOledSetup() {
      Blockly.Python.definitions_['import_machine_i2c'] = 'from machine import Pin, I2C';
      Blockly.Python.definitions_['import_ssd1306'] = 'import ssd1306';
      Blockly.Python.definitions_['oled_setup'] =
        'i2c1 = I2C(1, scl=Pin(19), sda=Pin(18), freq=400000)\n' +
        'oled = ssd1306.SSD1306_I2C(128, 64, i2c1)';
    }

    // DCモーター
    Blockly.Python['dc_motor'] = function (block) {
      var motor = block.getFieldValue('MOTOR');
      var direction = block.getFieldValue('DIRECTION');
      var speed = Blockly.Python.valueToCode(block, 'SPEED', Blockly.Python.ORDER_NONE) || '0';
      var pins = motorPins[motor];
      Blockly.Python.definitions_['import_machine_pwm'] = 'from machine import Pin, PWM';
      Blockly.Python.definitions_['motor' + motor + '_fin'] =
        'motor' + motor + '_fin = PWM(Pin(' + pins.fin + '))\nmotor' + motor + '_fin.freq(1000)';
      Blockly.Python.definitions_['motor' + motor + '_rin'] =
        'motor' + motor + '_rin = PWM(Pin(' + pins.rin + '))\nmotor' + motor + '_rin.freq(1000)';
      var code = '';
      if (direction === 'FORWARD') {
        code += 'motor' + motor + '_fin.duty_u16(int((' + speed + ') * 655.35))\n';
        code += 'motor' + motor + '_rin.duty_u16(0)\n';
      } else if (direction === 'REVERSE') {
        code += 'motor' + motor + '_fin.duty_u16(0)\n';
        code += 'motor' + motor + '_rin.duty_u16(int((' + speed + ') * 655.35))\n';
      } else {
        code += 'motor' + motor + '_fin.duty_u16(0)\n';
        code += 'motor' + motor + '_rin.duty_u16(0)\n';
      }
      return code;
    };

    // サーボ
    Blockly.Python['servo_set_angle'] = function (block) {
      var servo = block.getFieldValue('SERVO');
      var angle = Blockly.Python.valueToCode(block, 'ANGLE', Blockly.Python.ORDER_NONE) || '90';
      var pin = servoPins[servo];
      Blockly.Python.definitions_['import_machine_pwm'] = 'from machine import Pin, PWM';
      Blockly.Python.definitions_['servo' + servo + '_setup'] =
        'servo' + servo + ' = PWM(Pin(' + pin + '))\nservo' + servo + '.freq(50)';
      return 'servo' + servo + '.duty_u16(int((0.5 + (' + angle + ') / 180.0 * 2.0) / 20.0 * 65535))\n';
    };

    // OLED
    Blockly.Python['oled_text'] = function (block) {
      ensureOledSetup();
      var text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_NONE) || "''";
      var x = Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_NONE) || '0';
      var y = Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_NONE) || '0';
      return 'oled.text(str(' + text + '), ' + x + ', ' + y + ')\n';
    };
    Blockly.Python['oled_show'] = function () { ensureOledSetup(); return 'oled.show()\n'; };
    Blockly.Python['oled_clear'] = function () { ensureOledSetup(); return 'oled.fill(0)\n'; };
    Blockly.Python['oled_pixel'] = function (block) {
      ensureOledSetup();
      var x = Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_NONE) || '0';
      var y = Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_NONE) || '0';
      return 'oled.pixel(' + x + ', ' + y + ', ' + block.getFieldValue('COLOR') + ')\n';
    };
    Blockly.Python['oled_line'] = function (block) {
      ensureOledSetup();
      var x1 = Blockly.Python.valueToCode(block, 'X1', Blockly.Python.ORDER_NONE) || '0';
      var y1 = Blockly.Python.valueToCode(block, 'Y1', Blockly.Python.ORDER_NONE) || '0';
      var x2 = Blockly.Python.valueToCode(block, 'X2', Blockly.Python.ORDER_NONE) || '0';
      var y2 = Blockly.Python.valueToCode(block, 'Y2', Blockly.Python.ORDER_NONE) || '0';
      return 'oled.line(' + x1 + ', ' + y1 + ', ' + x2 + ', ' + y2 + ', 1)\n';
    };
    Blockly.Python['oled_rect'] = function (block) {
      ensureOledSetup();
      var x = Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_NONE) || '0';
      var y = Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_NONE) || '0';
      var w = Blockly.Python.valueToCode(block, 'W', Blockly.Python.ORDER_NONE) || '10';
      var h = Blockly.Python.valueToCode(block, 'H', Blockly.Python.ORDER_NONE) || '10';
      var fn = block.getFieldValue('STYLE') === 'FILL' ? 'fill_rect' : 'rect';
      return 'oled.' + fn + '(' + x + ', ' + y + ', ' + w + ', ' + h + ', 1)\n';
    };

    // アナログ入力
    Blockly.Python['nestcore_analog_read'] = function (block) {
      var pin = block.getFieldValue('PIN');
      Blockly.Python.definitions_['import_machine_adc'] = 'from machine import Pin, ADC';
      Blockly.Python.definitions_['adc_' + pin + '_setup'] = 'adc_' + pin + ' = ADC(Pin(' + pin + '))';
      return ['adc_' + pin + '.read_u16()', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    // ── UART ──
    function ensureUartSetup(baud) {
      Blockly.Python.definitions_['import_machine_uart'] = 'from machine import Pin, UART';
      Blockly.Python.definitions_['uart0_setup'] =
        'uart0 = UART(0, baudrate=' + baud + ', tx=Pin(0), rx=Pin(1))';
    }

    Blockly.Python['nestcore_uart_write'] = function (block) {
      var data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_NONE) || "''";
      var baud = block.getFieldValue('BAUD');
      ensureUartSetup(baud);
      return 'uart0.write(str(' + data + ') + "\\n")\n';
    };

    Blockly.Python['nestcore_uart_readline'] = function (block) {
      var baud = block.getFieldValue('BAUD');
      ensureUartSetup(baud);
      var code = '(uart0.readline() or b"").decode().strip()';
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    };

    Blockly.Python['nestcore_uart_any'] = function (block) {
      Blockly.Python.definitions_['import_machine_uart'] = 'from machine import Pin, UART';
      Blockly.Python.definitions_['uart0_setup'] =
        'uart0 = UART(0, baudrate=9600, tx=Pin(0), rx=Pin(1))';
      return ['uart0.any()', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    // ── I2C（汎用: SDA=GPIO20, SCL=GPIO21）──
    function ensureI2cSetup() {
      Blockly.Python.definitions_['import_machine_i2c'] = 'from machine import Pin, I2C';
      Blockly.Python.definitions_['i2c0_setup'] =
        'i2c0 = I2C(0, scl=Pin(21), sda=Pin(20), freq=400000)';
    }

    Blockly.Python['nestcore_i2c_scan'] = function (block) {
      ensureI2cSetup();
      return ['i2c0.scan()', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    Blockly.Python['nestcore_i2c_read'] = function (block) {
      ensureI2cSetup();
      var addr = Blockly.Python.valueToCode(block, 'ADDR', Blockly.Python.ORDER_NONE) || '0';
      var nbytes = Blockly.Python.valueToCode(block, 'NBYTES', Blockly.Python.ORDER_NONE) || '1';
      return ['i2c0.readfrom(' + addr + ', ' + nbytes + ')', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    Blockly.Python['nestcore_i2c_write'] = function (block) {
      ensureI2cSetup();
      var addr = Blockly.Python.valueToCode(block, 'ADDR', Blockly.Python.ORDER_NONE) || '0';
      var data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_NONE) || 'b""';
      return 'i2c0.writeto(' + addr + ', bytes(' + data + '))\n';
    };
  },

  // ── ツールボックスカテゴリ ──
  toolbox: (function () {
    var N = function (v) { return { shadow: { type: 'math_number', fields: { NUM: v } } }; };
    var T = function (v) { return { shadow: { type: 'text', fields: { TEXT: v } } }; };
    return [
      {
        kind: 'category', name: 'DCモーター', colour: '#E8724A',
        contents: [{ kind: 'block', type: 'dc_motor', inputs: { SPEED: N(60) } }]
      },
      {
        kind: 'category', name: 'サーボ', colour: '#E87070',
        contents: [{ kind: 'block', type: 'servo_set_angle', inputs: { ANGLE: N(90) } }]
      },
      {
        kind: 'category', name: 'OLED', colour: '#5BA0E0',
        contents: [
          { kind: 'block', type: 'oled_text', inputs: { TEXT: T('Hello'), X: N(0), Y: N(0) } },
          { kind: 'block', type: 'oled_show' },
          { kind: 'block', type: 'oled_clear' },
          { kind: 'block', type: 'oled_pixel', inputs: { X: N(0), Y: N(0) } },
          { kind: 'block', type: 'oled_line', inputs: { X1: N(0), Y1: N(0), X2: N(127), Y2: N(63) } },
          { kind: 'block', type: 'oled_rect', inputs: { X: N(0), Y: N(0), W: N(32), H: N(32) } }
        ]
      },
      {
        kind: 'category', name: 'PicoNest 入力', colour: '#5BA0E0',
        contents: [{ kind: 'block', type: 'nestcore_analog_read' }]
      },
      {
        kind: 'category', name: 'UART', colour: '#26A69A',
        contents: [
          { kind: 'block', type: 'nestcore_uart_write', inputs: { DATA: T('Hello') } },
          { kind: 'block', type: 'nestcore_uart_readline' },
          { kind: 'block', type: 'nestcore_uart_any' }
        ]
      },
      {
        kind: 'category', name: 'I2C', colour: '#7E57C2',
        contents: [
          { kind: 'block', type: 'nestcore_i2c_scan' },
          { kind: 'block', type: 'nestcore_i2c_read', inputs: { ADDR: N(60), NBYTES: N(1) } },
          { kind: 'block', type: 'nestcore_i2c_write', inputs: { ADDR: N(60), DATA: N(0) } }
        ]
      }
    ];
  })()
});
