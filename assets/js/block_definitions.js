// ──────────────────────────────
// Blockly カスタムブロック定義
// ──────────────────────────────

// スリープブロック
Blockly.Blocks['sleep'] = {
  init: function() {
    this.appendValueInput('DURATION')
        .setCheck('Number')
        .appendField('待つ');
    this.appendDummyInput()
        .appendField('秒');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E5A825');
    this.setTooltip('指定した秒数だけ待機します');
  }
};

//シリアル通信
//プリント
Blockly.Blocks['print'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .appendField('シリアルに書き出す');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#5DC06C');
    this.setTooltip('USBシリアルで値をコンソールに出力します');
    this.setHelpUrl('')
  }
};

//出力
//オンボードLED制御
Blockly.Blocks['led_control'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("オンボードLEDを")
        .appendField(new Blockly.FieldDropdown([
          ['点灯(ON)','1'],
          ['消灯(OFF)','0']
        ]), 'STATE')
        .appendField('にする');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E8724A');
    this.setTooltip('Raspberry Pi PicoのオンボードLEDを点灯/消灯します');
    this.setHelpUrl('');
  }
};

//デジタル出力
Blockly.Blocks['digital_write'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('デジタル出力 ピン:')
        .appendField(new Blockly.FieldNumber(0,0,28,1),'PIN')
        .appendField(new Blockly.FieldDropdown([
          ['HIGH(1)','1'],
          ['LOW(0)','0']
        ]), 'VALUE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E8724A');
    this.setTooltip('指定したピンにデジタル信号(HIGH/LOW)を出力します');
    this.setHelpUrl('')
  }
};

//アナログ出力(PWM)
Blockly.Blocks['analog_write'] = {
    init: function() {
        this.appendValueInput('VALUE')
            .setCheck('Number')
            .appendField('アナログ出力 ピン:')
            .appendField(new Blockly.FieldNumber(0,0,28,1), 'PIN')
            .appendField('値(0~65535):');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#E8724A')
        this.setTooltip('指定したピンにアナログ信号を出力します(0~65535)');
        this.setHelpUrl('');
    }
};

//入力
//デジタル入力
Blockly.Blocks['digital_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('デジタル入力 ピン:')
        .appendField(new Blockly.FieldNumber(0,0,28,1),'PIN');
    this.setOutput(true, 'Number');
    this.setColour('#5BA0E0');
    this.setTooltip('指定したピンのデジタル入力値(0/1)を読み取ります');
    this.setHelpUrl('')
  }
};

//アナログ入力(ADC)
Blockly.Blocks['analog_read'] = {
    init: function() {
        this.appendDummyInput()
            .appendField('アナログ入力')
            .appendField(new Blockly.FieldDropdown([
                ['GP26 (ADC0)','26'],
                ['GP27 (ADC1)','27'],
                ['GP28 (ADC2)','28'],
                ['内部温度センサー','4']
            ]), 'PIN');
        this.setOutput(true, 'Number');
        this.setColour('#5BA0E0');
        this.setTooltip('指定したピンのアナログ入力値(0~65535)を読み取ります');
        this.setHelpUrl('');
    }
};

//アナログ出力(PWM) パーセント指定
Blockly.Blocks['analog_write_percent'] = {
    init: function() {
        this.appendValueInput('PERCENT')
            .setCheck('Number')
            .appendField('アナログ出力 ピン:')
            .appendField(new Blockly.FieldNumber(0,0,28,1), 'PIN')
            .appendField('duty比(%):');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#E8724A');
        this.setTooltip('指定したピンにPWM信号を出力します(0~100%)');
        this.setHelpUrl('');
    }
};

// 最初だけ実行するブロック（非同期セットアップ）
Blockly.Blocks['setup_block'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('最初だけ実行する');
    this.appendStatementInput('DO')
        .setCheck(null);
    this.setColour('#4A90D9');
    this.setTooltip('プログラム開始時に1回だけ実行されます');
    this.setHelpUrl('');
    this.setDeletable(true);
    this.setMovable(true);
  }
};

// ずっと実行するブロック（非同期ループ）
Blockly.Blocks['forever_loop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('ずっと実行する');
    this.appendStatementInput('DO')
        .setCheck(null);
    this.setColour('#4A90D9');
    this.setTooltip('中のコードをずっと繰り返します。複数置くと同時に動きます');
    this.setHelpUrl('');
    this.setDeletable(true);
    this.setMovable(true);
  }
};


// ──────────────────────────────
// テキスト
// ──────────────────────────────

// テキスト結合
Blockly.Blocks['text_join'] = {
  init: function() {
    this.appendValueInput('A');
    this.appendValueInput('B')
        .appendField('+');
    this.setInputsInline(true);
    this.setOutput(true, 'String');
    this.setColour('#5CA68E');
    this.setTooltip('2つの値を文字列として結合します');
  }
};

// テキストの長さ
Blockly.Blocks['text_length'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .appendField('の長さ');
    this.setOutput(true, 'Number');
    this.setColour('#5CA68E');
    this.setTooltip('テキストの文字数を返します');
  }
};

// ──────────────────────────────
// グラフ（リアルタイムデータ送信）
// ──────────────────────────────

// グラフにデータを追加
Blockly.Blocks['graph_add_data'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('グラフに追加')
        .appendField(new Blockly.FieldTextInput('データ1'), 'LABEL');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E8724A');
    this.setTooltip('グラフタブにデータを送信します。ラベルごとに別の線で表示されます');
  }
};