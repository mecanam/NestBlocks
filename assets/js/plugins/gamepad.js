// ──────────────────────────────
// プラグイン: GamePad — 受信機 (aioble GATT)
// controller.py を書き込んだコントローラー基板から BLE GATT で受信します
//
// 受信フォーマット: "joy_x,joy_y,buttons_ctrl" (カンマ区切り文字列)
//   joy_x, joy_y : -100〜100  (左/下 が 負、右/上 が 正)
//   buttons_ctrl : 12ビットマスク
//                  ビット0=ボタン1(GP2) 〜 ビット11=ボタン12(GP14)
// ──────────────────────────────
NestPlugins.register({
  id: 'gamepad',
  name: 'GamePad',
  description: 'コントローラー基板からBLEでジョイスティック・ボタンデータを受信します。',
  icon: '🕹️',
  color: '#7C4DFF',
  thumbSvg: '<svg viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" rx="8" fill="#EDE7F6"/><rect x="40" y="20" width="160" height="80" rx="18" fill="#37474F"/><rect x="44" y="24" width="152" height="72" rx="15" fill="#455A64"/><circle cx="95" cy="60" r="20" fill="#546E7A"/><circle cx="95" cy="60" r="13" fill="#7C4DFF"/><circle cx="95" cy="53" r="2.5" fill="#B388FF"/><rect x="145" y="42" width="14" height="14" rx="7" fill="#4CAF50"/><rect x="163" y="42" width="14" height="14" rx="7" fill="#F44336"/><rect x="145" y="60" width="14" height="14" rx="7" fill="#2196F3"/><rect x="163" y="60" width="14" height="14" rx="7" fill="#FFC107"/><rect x="70" y="85" width="36" height="5" rx="2.5" fill="#7C4DFF" opacity=".5"/><rect x="130" y="85" width="36" height="5" rx="2.5" fill="#7C4DFF" opacity=".3"/></svg>',
  boards: ['pico'],

  initBlocks: function () {

    // ── デバイス名設定 ──
    Blockly.Blocks['gamepad_join'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('GamePad デバイス名')
          .appendField(new Blockly.FieldTextInput('gamepad'), 'NAME')
          .appendField('で接続');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#7C4DFF');
        this.setTooltip('calibration.html で設定したコントローラー名を入力してください\nコントローラーと受信機が同じ名前でペアリングされます');
      }
    };

    // ── コントローラーデータを受信したとき（foreverタスクとして実行）──
    Blockly.Blocks['gamepad_on_data'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('コントローラーデータを受信したとき');
        this.appendStatementInput('DO');
        this.setColour('#7C4DFF');
        this.setTooltip('コントローラーからデータを受信するたびに実行します\n「ジョイスティック」「ボタン」ブロックで値を取得できます');
      }
    };

    // ── ジョイスティック X ──
    Blockly.Blocks['gamepad_joy_x'] = {
      init: function () {
        this.appendDummyInput().appendField('ジョイスティック X');
        this.setOutput(true, 'Number');
        this.setColour('#7C4DFF');
        this.setTooltip('X 値（-100〜100、左:負 / 右:正）\n「コントローラーデータを受信したとき」の中で使用してください');
      }
    };

    // ── ジョイスティック Y ──
    Blockly.Blocks['gamepad_joy_y'] = {
      init: function () {
        this.appendDummyInput().appendField('ジョイスティック Y');
        this.setOutput(true, 'Number');
        this.setColour('#7C4DFF');
        this.setTooltip('Y 値（-100〜100、下:負 / 上:正）\n「コントローラーデータを受信したとき」の中で使用してください');
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
        this.setTooltip('ジョイスティックが指定した方向に倒されていれば True（しきい値: 30）\n「コントローラーデータを受信したとき」の中で使用してください');
      }
    };

    // ── ボタンが押されている ──
    var BTN_OPTIONS = [
      ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'],
      ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'],
      ['9', '9'], ['10', '10'], ['11', '11'], ['12', '12']
    ];

    Blockly.Blocks['gamepad_btn'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('ボタン')
          .appendField(new Blockly.FieldDropdown(BTN_OPTIONS), 'BTN')
          .appendField('が押されている');
        this.setOutput(true, 'Boolean');
        this.setColour('#7C4DFF');
        this.setTooltip('指定したボタンが押されていれば True\n「コントローラーデータを受信したとき」の中で使用してください');
      }
    };

    // ── いずれかのボタンが押されている ──
    Blockly.Blocks['gamepad_any_btn'] = {
      init: function () {
        this.appendDummyInput()
          .appendField('いずれかのボタンが押されている');
        this.setOutput(true, 'Boolean');
        this.setColour('#7C4DFF');
        this.setTooltip('12個のボタンのうち1つでも押されていれば True\n「コントローラーデータを受信したとき」の中で使用してください');
      }
    };
  },

  initGenerators: function () {

    function ensureGamepadAiobleSetup() {
      Blockly.Python.definitions_['import_aioble']   = 'import aioble';
      Blockly.Python.definitions_['import_bluetooth'] = 'import bluetooth';
      Blockly.Python.definitions_['import_sys']       = 'import sys';
      Blockly.Python.definitions_['gamepad_uuids'] =
        '_GP_SVC_UUID  = bluetooth.UUID(\'12345678-1234-5678-1234-56789abcdef0\')\n' +
        '_GP_CHAR_UUID = bluetooth.UUID(\'abcdefab-cdef-1234-5678-1234567890ab\')';
      if (!Blockly.Python.definitions_['gamepad_name']) {
        Blockly.Python.definitions_['gamepad_name'] = "_GP_NAME = 'NB-gamepad'";
      }
    }

    // デバイス名設定
    Blockly.Python['gamepad_join'] = function (block) {
      var name = block.getFieldValue('NAME');
      Blockly.Python.definitions_['import_aioble']   = 'import aioble';
      Blockly.Python.definitions_['import_bluetooth'] = 'import bluetooth';
      Blockly.Python.definitions_['gamepad_uuids'] =
        '_GP_SVC_UUID  = bluetooth.UUID(\'12345678-1234-5678-1234-56789abcdef0\')\n' +
        '_GP_CHAR_UUID = bluetooth.UUID(\'abcdefab-cdef-1234-5678-1234567890ab\')';
      Blockly.Python.definitions_['gamepad_name'] = "_GP_NAME = 'NB-" + name + "'";
      return '';
    };

    // コントローラーデータを受信したとき
    // main.js が isForever タスクとして async def task_N() でラップし gather() で並行実行する
    // generator が返すコードは prefixLines で 2 スペース追加される（インデント基準）
    Blockly.Python['gamepad_on_data'] = function (block) {
      ensureGamepadAiobleSetup();
      var body = Blockly.Python.statementToCode(block, 'DO') || '  pass\n';
      // statementToCode は 2 スペース → 内側 try ブロック用に 6 スペース追加（計 8 スペース）
      // prefixLines が 2 スペース追加するので最終的に 10 スペース（正しいネスト）
      var innerBody = body.replace(/^(?!\s*$)/mg, '      ');
      return (
        'while True:\n' +
        '  try:\n' +
        '    _gp_dev = None\n' +
        '    async with aioble.scan(5000, interval_us=30000, window_us=30000, active=True) as _gp_sc:\n' +
        '      async for _gp_r in _gp_sc:\n' +
        '        if _gp_r.name() == _GP_NAME:\n' +
        '          _gp_dev = _gp_r.device\n' +
        '          break\n' +
        '    if _gp_dev is None:\n' +
        '      await uasyncio.sleep_ms(1000)\n' +
        '      continue\n' +
        '    _gp_conn = await _gp_dev.connect(timeout_ms=5000)\n' +
        '    _gp_svc = await _gp_conn.service(_GP_SVC_UUID)\n' +
        '    _gp_char = await _gp_svc.characteristic(_GP_CHAR_UUID)\n' +
        '    await _gp_char.subscribe(notify=True)\n' +
        '    print(\'Gamepad: connected\')\n' +
        '    while _gp_conn.is_connected():\n' +
        '      try:\n' +
        '        _ble_data = await _gp_char.notified(timeout_ms=2000)\n' +
        '        _ble_text = _ble_data.decode()\n' +
        '        _gp_vals = _ble_text.split(\',\')\n' +
        '        _gp_x = int(_gp_vals[0])\n' +
        '        _gp_y = int(_gp_vals[1])\n' +
        '        _gp_btns = int(_gp_vals[2])\n' +
        innerBody +
        '      except TimeoutError:\n' +
        '        pass\n' +
        '      except Exception as _gp_e:\n' +
        '        sys.print_exception(_gp_e)\n' +
        '    print(\'Gamepad: disconnected\')\n' +
        '  except Exception as _gp_e:\n' +
        '    sys.print_exception(_gp_e)\n' +
        '    await uasyncio.sleep_ms(2000)\n'
      );
    };

    // ジョイスティック X (-100〜100)
    Blockly.Python['gamepad_joy_x'] = function () {
      return ['_gp_x', Blockly.Python.ORDER_ATOMIC];
    };

    // ジョイスティック Y (-100〜100)
    Blockly.Python['gamepad_joy_y'] = function () {
      return ['_gp_y', Blockly.Python.ORDER_ATOMIC];
    };

    // 方向判定（しきい値 30）
    Blockly.Python['gamepad_direction'] = function (block) {
      var dir = block.getFieldValue('DIR');
      var codeMap = {
        'UP':     '(_gp_y > 30)',
        'DOWN':   '(_gp_y < -30)',
        'LEFT':   '(_gp_x < -30)',
        'RIGHT':  '(_gp_x > 30)',
        'CENTER': '(-30 <= _gp_x <= 30 and -30 <= _gp_y <= 30)'
      };
      return [codeMap[dir], Blockly.Python.ORDER_ATOMIC];
    };

    // ボタン N が押されている（ビット N-1 を検査）
    Blockly.Python['gamepad_btn'] = function (block) {
      var btn = parseInt(block.getFieldValue('BTN'), 10);
      return ['((_gp_btns >> ' + (btn - 1) + ') & 1)', Blockly.Python.ORDER_ATOMIC];
    };

    // いずれかのボタンが押されている
    Blockly.Python['gamepad_any_btn'] = function () {
      return ['(_gp_btns != 0)', Blockly.Python.ORDER_ATOMIC];
    };
  },

  toolbox: {
    kind: 'category', name: 'GamePad', colour: '#7C4DFF',
    contents: [
      { kind: 'block', type: 'gamepad_join' },
      { kind: 'sep', gap: '16' },
      { kind: 'label', text: 'データ受信' },
      { kind: 'block', type: 'gamepad_on_data' },
      { kind: 'sep', gap: '16' },
      { kind: 'label', text: 'ジョイスティック' },
      { kind: 'block', type: 'gamepad_joy_x' },
      { kind: 'block', type: 'gamepad_joy_y' },
      { kind: 'block', type: 'gamepad_direction' },
      { kind: 'sep', gap: '16' },
      { kind: 'label', text: 'ボタン' },
      { kind: 'block', type: 'gamepad_btn' },
      { kind: 'block', type: 'gamepad_any_btn' }
    ]
  }
});
