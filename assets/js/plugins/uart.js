// ──────────────────────────────
// プラグイン: UART（汎用）
// 任意のピンでUART通信を行う
// ──────────────────────────────
NestPlugins.register({
  id: 'uart',
  name: 'UART 通信',
  description: '任意のピンを指定して UART シリアル通信を行うブロック。センサーや他のマイコンとの通信に。',
  icon: '🔌',
  color: '#26A69A',
  thumbSvg: '<svg viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" rx="8" fill="#E0F2F1"/><rect x="20" y="35" width="80" height="50" rx="8" fill="#1B5E20"/><rect x="24" y="39" width="72" height="42" rx="5" fill="#2E7D32"/><text x="60" y="56" text-anchor="middle" font-family="monospace" font-size="8" font-weight="bold" fill="#A5D6A7">TX</text><text x="60" y="72" text-anchor="middle" font-family="monospace" font-size="8" font-weight="bold" fill="#A5D6A7">RX</text><rect x="140" y="35" width="80" height="50" rx="8" fill="#004D40"/><rect x="144" y="39" width="72" height="42" rx="5" fill="#00695C"/><text x="180" y="64" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#80CBC4">DEVICE</text><line x1="100" y1="52" x2="140" y2="52" stroke="#26A69A" stroke-width="3" stroke-linecap="round"/><line x1="140" y1="68" x2="100" y2="68" stroke="#26A69A" stroke-width="3" stroke-linecap="round"/><polygon points="135,48 140,52 135,56" fill="#26A69A"/><polygon points="105,64 100,68 105,72" fill="#26A69A"/></svg>',
  boards: ['pico'],

  _gpioOptions: (function () {
    var opts = [];
    for (var i = 0; i <= 22; i++) opts.push(['GP' + i, String(i)]);
    opts.push(['GP26', '26'], ['GP27', '27'], ['GP28', '28']);
    return opts;
  })(),

  initBlocks: function () {
    var gpioOpts = this._gpioOptions;

    // UART 初期化
    Blockly.Blocks['uart_init'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('UART 初期化')
          .appendField('TX')
          .appendField(new Blockly.FieldDropdown(gpioOpts), 'TX')
          .appendField('RX')
          .appendField(new Blockly.FieldDropdown(gpioOpts), 'RX')
          .appendField('ボーレート')
          .appendField(new Blockly.FieldDropdown([
            ['9600', '9600'], ['115200', '115200'],
            ['19200', '19200'], ['38400', '38400'], ['57600', '57600']
          ]), 'BAUD');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#26A69A');
        this.setTooltip('UART を初期化します。最初に1回だけ実行してください。');
      }
    };

    // UART 送信
    Blockly.Blocks['uart_write'] = {
      init: function () {
        this.appendValueInput('DATA').setCheck(null).appendField('UART 送信');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#26A69A');
        this.setTooltip('UART でデータを送信します');
      }
    };

    // UART 1行受信
    Blockly.Blocks['uart_readline'] = {
      init: function () {
        this.appendDummyInput().appendField('UART 1行受信');
        this.setOutput(true, 'String');
        this.setColour('#26A69A');
        this.setTooltip('UART から1行読み取ります');
      }
    };

    // UART データあり？
    Blockly.Blocks['uart_any'] = {
      init: function () {
        this.appendDummyInput().appendField('UART データあり？');
        this.setOutput(true, 'Boolean');
        this.setColour('#26A69A');
        this.setTooltip('UART バッファにデータがあれば True');
      }
    };
  },

  initGenerators: function () {
    Blockly.Python['uart_init'] = function (block) {
      var tx = block.getFieldValue('TX');
      var rx = block.getFieldValue('RX');
      var baud = block.getFieldValue('BAUD');
      Blockly.Python.definitions_['import_machine_uart'] = 'from machine import Pin, UART';
      Blockly.Python.definitions_['uart_setup'] =
        'uart = UART(0, baudrate=' + baud + ', tx=Pin(' + tx + '), rx=Pin(' + rx + '))';
      return '';
    };

    Blockly.Python['uart_write'] = function (block) {
      var data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_NONE) || "''";
      return 'uart.write(str(' + data + ') + "\\n")\n';
    };

    Blockly.Python['uart_readline'] = function (block) {
      return ['(uart.readline() or b"").decode().strip()', Blockly.Python.ORDER_FUNCTION_CALL];
    };

    Blockly.Python['uart_any'] = function (block) {
      return ['uart.any()', Blockly.Python.ORDER_FUNCTION_CALL];
    };
  },

  toolbox: (function () {
    var T = function (v) { return { shadow: { type: 'text', fields: { TEXT: v } } }; };
    return {
      kind: 'category', name: 'UART', colour: '#26A69A',
      contents: [
        { kind: 'block', type: 'uart_init' },
        { kind: 'block', type: 'uart_write', inputs: { DATA: T('Hello') } },
        { kind: 'block', type: 'uart_readline' },
        { kind: 'block', type: 'uart_any' }
      ]
    };
  })()
});
