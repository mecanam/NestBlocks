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
// リスト
// ──────────────────────────────

// リストを作成（要素数を自由に変更可能）
Blockly.Blocks['list_create'] = {
  init: function() {
    this.setColour('#745CA6');
    this.setOutput(true, 'Array');
    this.setTooltip('リストを作成します。歯車アイコンで要素数を変更できます');
    this.setMutator(new Blockly.Mutator(['list_create_item']));
    this.itemCount_ = 2;
    this.updateShape_();
  },
  mutationToDom: function() {
    var container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  domToMutation: function(xml) {
    this.itemCount_ = parseInt(xml.getAttribute('items'), 10);
    this.updateShape_();
  },
  decompose: function(workspace) {
    var containerBlock = workspace.newBlock('list_create_container');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock('list_create_item');
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  compose: function(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput('V' + i) && this.getInput('V' + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) === -1) {
        connection.disconnect();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
    for (var j = 0; j < this.itemCount_; j++) {
      Blockly.Mutator.reconnect(connections[j], this, 'V' + j);
    }
  },
  saveConnections: function(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 0;
    while (itemBlock) {
      var input = this.getInput('V' + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      i++;
    }
  },
  updateShape_: function() {
    // 既存の入力を削除
    for (var i = 0; this.getInput('V' + i); i++) {
      this.removeInput('V' + i);
    }
    if (this.getInput('EMPTY')) this.removeInput('EMPTY');
    // 新しい入力を追加
    if (this.itemCount_ === 0) {
      this.appendDummyInput('EMPTY').appendField('空のリスト');
    } else {
      for (var j = 0; j < this.itemCount_; j++) {
        var input = this.appendValueInput('V' + j);
        if (j === 0) input.appendField('リスト');
      }
    }
    this.setInputsInline(this.itemCount_ <= 4);
  }
};

// ミューテーター用の内部ブロック
Blockly.Blocks['list_create_container'] = {
  init: function() {
    this.appendDummyInput().appendField('要素');
    this.appendStatementInput('STACK');
    this.setColour('#745CA6');
    this.setTooltip('要素を追加・削除してリストの長さを変更');
    this.contextMenu = false;
  }
};

Blockly.Blocks['list_create_item'] = {
  init: function() {
    this.appendDummyInput().appendField('要素');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour('#745CA6');
    this.setTooltip('');
    this.contextMenu = false;
  }
};

// リストの要素を取得
Blockly.Blocks['list_get'] = {
  init: function() {
    this.appendValueInput('LIST')
        .setCheck('Array');
    this.appendValueInput('INDEX')
        .setCheck('Number')
        .appendField('の');
    this.appendDummyInput()
        .appendField('番目');
    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setColour('#745CA6');
    this.setTooltip('リストの指定した位置の要素を取得します（0番目から）');
  }
};

// リストの要素を設定
Blockly.Blocks['list_set'] = {
  init: function() {
    this.appendValueInput('LIST')
        .setCheck('Array');
    this.appendValueInput('INDEX')
        .setCheck('Number')
        .appendField('の');
    this.appendValueInput('VALUE')
        .appendField('番目を');
    this.appendDummyInput()
        .appendField('にする');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#745CA6');
    this.setTooltip('リストの指定した位置の要素を変更します');
  }
};

// リストに追加
Blockly.Blocks['list_append'] = {
  init: function() {
    this.appendValueInput('LIST')
        .setCheck('Array');
    this.appendValueInput('VALUE')
        .appendField('に');
    this.appendDummyInput()
        .appendField('を追加');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#745CA6');
    this.setTooltip('リストの末尾に要素を追加します');
  }
};

// リストの長さ
Blockly.Blocks['list_length'] = {
  init: function() {
    this.appendValueInput('LIST')
        .setCheck('Array')
        .appendField('の長さ');
    this.setOutput(true, 'Number');
    this.setColour('#745CA6');
    this.setTooltip('リストの要素数を返します');
  }
};

// ──────────────────────────────
// 数学（追加）
// ──────────────────────────────

// 値を範囲内に制限（クランプ）
// 絶対値（マイナスをプラスにする）
Blockly.Blocks['math_abs'] = {
  init: function() {
    this.appendValueInput('NUM')
        .setCheck('Number');
    this.appendDummyInput()
        .appendField('をプラスの数にする（絶対値）');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour('#5BA0E0');
    this.setTooltip('マイナスの数をプラスに変えます（絶対値）。例：-5 → 5、3 → 3');
  }
};

// 範囲におさめる（最小以上・最大以下にする）
Blockly.Blocks['math_clamp'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number');
    this.appendValueInput('LOW')
        .setCheck('Number')
        .appendField('を');
    this.appendValueInput('HIGH')
        .setCheck('Number')
        .appendField('以上');
    this.appendDummyInput()
        .appendField('以下におさめる');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour('#5BA0E0');
    this.setTooltip('値を「最小以上・最大以下」の範囲におさめます。範囲をはみ出したら、いちばん近い方の値になります');
  }
};

// 範囲変換（Arduino の map 関数と同じ）
Blockly.Blocks['math_map'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number');
    this.appendValueInput('FROM_LOW')
        .setCheck('Number')
        .appendField('を');
    this.appendValueInput('FROM_HIGH')
        .setCheck('Number')
        .appendField('〜');
    this.appendValueInput('TO_LOW')
        .setCheck('Number')
        .appendField('の範囲から');
    this.appendValueInput('TO_HIGH')
        .setCheck('Number')
        .appendField('〜');
    this.appendDummyInput()
        .appendField('の範囲に変換');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour('#5BA0E0');
    this.setTooltip('ある範囲の値を、同じ割合のまま別の範囲の値に置きかえます。例：0〜1023 の値を 0〜255 に変換（Arduino の map と同じ）');
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