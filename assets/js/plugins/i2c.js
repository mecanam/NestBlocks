// ──────────────────────────────
// プラグイン: I2C（汎用）
// 任意のピンでI2C通信を行う
// ──────────────────────────────
NestPlugins.register({
  id: 'i2c',
  name: 'I2C 通信',
  description: '任意のピンを指定して I2C バス通信を行うブロック。各種センサーやディスプレイの接続に。',
  icon: '🔗',
  color: '#7E57C2',
  thumbSvg: '<svg viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" rx="8" fill="#EDE7F6"/><rect x="90" y="10" width="60" height="30" rx="6" fill="#4527A0"/><text x="120" y="30" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#B39DDB">PICO</text><line x1="120" y1="40" x2="120" y2="55" stroke="#7E57C2" stroke-width="3"/><line x1="40" y1="55" x2="200" y2="55" stroke="#7E57C2" stroke-width="3" stroke-linecap="round"/><text x="30" y="52" text-anchor="end" font-family="monospace" font-size="7" fill="#7E57C2">SDA</text><text x="210" y="52" font-family="monospace" font-size="7" fill="#7E57C2">SCL</text><line x1="60" y1="55" x2="60" y2="72" stroke="#7E57C2" stroke-width="2"/><line x1="120" y1="55" x2="120" y2="72" stroke="#7E57C2" stroke-width="2"/><line x1="180" y1="55" x2="180" y2="72" stroke="#7E57C2" stroke-width="2"/><rect x="42" y="72" width="36" height="36" rx="5" fill="#6A1B9A"/><text x="60" y="87" text-anchor="middle" font-family="monospace" font-size="6" fill="#CE93D8">0x3C</text><text x="60" y="100" text-anchor="middle" font-family="monospace" font-size="5" fill="#CE93D8">OLED</text><rect x="102" y="72" width="36" height="36" rx="5" fill="#6A1B9A"/><text x="120" y="87" text-anchor="middle" font-family="monospace" font-size="6" fill="#CE93D8">0x76</text><text x="120" y="100" text-anchor="middle" font-family="monospace" font-size="5" fill="#CE93D8">BME</text><rect x="162" y="72" width="36" height="36" rx="5" fill="#6A1B9A"/><text x="180" y="87" text-anchor="middle" font-family="monospace" font-size="6" fill="#CE93D8">0x68</text><text x="180" y="100" text-anchor="middle" font-family="monospace" font-size="5" fill="#CE93D8">MPU</text></svg>',
  boards: ['pico'],

  _gpioOptions: (function () {
    var opts = [];
    for (var i = 0; i <= 22; i++) opts.push(['GP' + i, String(i)]);
    opts.push(['GP26', '26'], ['GP27', '27'], ['GP28', '28']);
    return opts;
  })(),

  initBlocks: function () {
    var gpioOpts = this._gpioOptions;

    // I2C 初期化
    Blockly.Blocks['i2c_init'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('I2C 初期化')
          .appendField('SDA')
          .appendField(new Blockly.FieldDropdown(gpioOpts), 'SDA')
          .appendField('SCL')
          .appendField(new Blockly.FieldDropdown(gpioOpts), 'SCL');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#7E57C2');
        this.setTooltip('I2C バスを初期化します。最初に1回だけ実行してください。');
      }
    };

    // I2C スキャン
    Blockly.Blocks['i2c_scan'] = {
      init: function () {
        this.appendDummyInput().appendField('I2C デバイスをスキャン');
        this.setOutput(true, 'Array');
        this.setColour('#7E57C2');
        this.setTooltip('I2C バスに接続されたデバイスのアドレス一覧を返します');
      }
    };

    // I2C 読み取り
    Blockly.Blocks['i2c_read'] = {
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
    Blockly.Blocks['i2c_write'] = {
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

    // I2C レジスタ読み取り
    Blockly.Blocks['i2c_read_reg'] = {
      init: function () {
        this.appendValueInput('ADDR').setCheck('Number').appendField('I2C レジスタ読取 アドレス');
        this.appendValueInput('REG').setCheck('Number').appendField('レジスタ');
        this.appendValueInput('NBYTES').setCheck('Number').appendField('バイト数');
        this.setInputsInline(true);
        this.setOutput(true, null);
        this.setColour('#7E57C2');
        this.setTooltip('I2C デバイスの特定レジスタからデータを読み取ります');
      }
    };
  },

  initGenerators: function () {
    Blockly.Python['i2c_init'] = function (block) {
      var sda = block.getFieldValue('SDA');
      var scl = block.getFieldValue('SCL');
      Blockly.Python.definitions_['import_machine_i2c'] = 'from machine import Pin, I2C';
      Blockly.Python.definitions_['i2c_bus_setup'] =
        'i2c_bus = I2C(0, scl=Pin(' + scl + '), sda=Pin(' + sda + '), freq=400000)';
      return '';
    };

    Blockly.Python['i2c_scan'] = function (block) {
      return ['i2c_bus.scan()', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    Blockly.Python['i2c_read'] = function (block) {
      var addr = Blockly.Python.valueToCode(block, 'ADDR', Blockly.Python.ORDER_NONE) || '0';
      var nbytes = Blockly.Python.valueToCode(block, 'NBYTES', Blockly.Python.ORDER_NONE) || '1';
      return ['i2c_bus.readfrom(' + addr + ', ' + nbytes + ')', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    Blockly.Python['i2c_write'] = function (block) {
      var addr = Blockly.Python.valueToCode(block, 'ADDR', Blockly.Python.ORDER_NONE) || '0';
      var data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_NONE) || 'b""';
      return 'i2c_bus.writeto(' + addr + ', bytes(' + data + '))\n';
    };

    Blockly.Python['i2c_read_reg'] = function (block) {
      var addr = Blockly.Python.valueToCode(block, 'ADDR', Blockly.Python.ORDER_NONE) || '0';
      var reg = Blockly.Python.valueToCode(block, 'REG', Blockly.Python.ORDER_NONE) || '0';
      var nbytes = Blockly.Python.valueToCode(block, 'NBYTES', Blockly.Python.ORDER_NONE) || '1';

      Blockly.Python.provideFunction_('i2c_read_reg', [
        'def i2c_read_reg(bus, addr, reg, n):',
        '    bus.writeto(addr, bytes([reg]))',
        '    return bus.readfrom(addr, n)'
      ]);

      return ['i2c_read_reg(i2c_bus, ' + addr + ', ' + reg + ', ' + nbytes + ')', Blockly.Python.ORDER_FUNCTION_CALL];
    };
  },

  toolbox: (function () {
    var N = function (v) { return { shadow: { type: 'math_number', fields: { NUM: v } } }; };
    return {
      kind: 'category', name: 'I2C', colour: '#7E57C2',
      contents: [
        { kind: 'block', type: 'i2c_init' },
        { kind: 'block', type: 'i2c_scan' },
        { kind: 'block', type: 'i2c_read', inputs: { ADDR: N(60), NBYTES: N(1) } },
        { kind: 'block', type: 'i2c_write', inputs: { ADDR: N(60), DATA: N(0) } },
        { kind: 'block', type: 'i2c_read_reg', inputs: { ADDR: N(60), REG: N(0), NBYTES: N(1) } }
      ]
    };
  })()
});
