// ──────────────────────────────
// Blockly Python コード生成
// ──────────────────────────────

// このファイルでは、標準ブロックとカスタムブロックのPython生成ロジックを定義します


// ════════════════════════════════════════════════════════
// ロジックブロック
// ════════════════════════════════════════════════════════

// if文ブロック
Blockly.Python['controls_if'] = function(block) {
    let n = 0;
    let code = '';
    if (Blockly.Python.STATEMENT_PREFIX) {
        code += Blockly.Python.injectId(Blockly.Python.STATEMENT_PREFIX, block);
    }
    do {
        const conditionCode = Blockly.Python.valueToCode(block, 'IF' + n, Blockly.Python.ORDER_NONE) || 'False';
        let branchCode = Blockly.Python.statementToCode(block, 'DO' + n);
        if (Blockly.Python.STATEMENT_SUFFIX) {
            branchCode = Blockly.Python.prefixLines(
                Blockly.Python.injectId(Blockly.Python.STATEMENT_SUFFIX, block),
                Blockly.Python.INDENT) + branchCode;
        }
        code += (n === 0 ? 'if ' : 'elif ') + conditionCode + ':\n' + (branchCode || Blockly.Python.PASS);
        n++;
    } while (block.getInput('IF' + n));

    if (block.getInput('ELSE') || Blockly.Python.STATEMENT_SUFFIX) {
        let branchCode = Blockly.Python.statementToCode(block, 'ELSE');
        if (Blockly.Python.STATEMENT_SUFFIX) {
            branchCode = Blockly.Python.prefixLines(
                Blockly.Python.injectId(Blockly.Python.STATEMENT_SUFFIX, block),
                Blockly.Python.INDENT) + branchCode;
        }
        code += 'else:\n' + (branchCode || Blockly.Python.PASS);
    }
    return code;
};

// 比較演算子ブロック
Blockly.Python['logic_compare'] = function(block) {
    const OPERATORS = {
        'EQ': '==',
        'NEQ': '!=',
        'LT': '<',
        'LTE': '<=',
        'GT': '>',
        'GTE': '>='
    };
    const operator = OPERATORS[block.getFieldValue('OP')];
    const order = Blockly.Python.ORDER_RELATIONAL;
    const argument0 = Blockly.Python.valueToCode(block, 'A', order) || '0';
    const argument1 = Blockly.Python.valueToCode(block, 'B', order) || '0';
    const code = `${argument0} ${operator} ${argument1}`;
    return [code, order];
};

// 論理演算子ブロック
Blockly.Python['logic_operation'] = function(block) {
    const operator = (block.getFieldValue('OP') === 'AND') ? 'and' : 'or';
    const order = (operator === 'and') ? Blockly.Python.ORDER_LOGICAL_AND : Blockly.Python.ORDER_LOGICAL_OR;
    const argument0 = Blockly.Python.valueToCode(block, 'A', order);
    const argument1 = Blockly.Python.valueToCode(block, 'B', order);
    if (!argument0 && !argument1) {
        const code = (operator === 'and') ? 'True' : 'False';
        return [code, Blockly.Python.ORDER_ATOMIC];
    }
    const code = (argument0 || 'False') + ' ' + operator + ' ' + (argument1 || 'False');
    return [code, order];
};

// 否定ブロック
Blockly.Python['logic_negate'] = function(block) {
    const order = Blockly.Python.ORDER_LOGICAL_NOT;
    const argument0 = Blockly.Python.valueToCode(block, 'BOOL', order) || 'True';
    const code = `not ${argument0}`;
    return [code, order];
};

// 真偽値ブロック
Blockly.Python['logic_boolean'] = function(block) {
    const code = (block.getFieldValue('BOOL') === 'TRUE') ? 'True' : 'False';
    return [code, Blockly.Python.ORDER_ATOMIC];
};


// ════════════════════════════════════════════════════════
// ループブロック
// ════════════════════════════════════════════════════════

// 繰り返しブロック
Blockly.Python['controls_repeat_ext'] = function(block) {
    const repeats = Blockly.Python.valueToCode(block, 'TIMES', Blockly.Python.ORDER_NONE) || '0';
    let branch = Blockly.Python.statementToCode(block, 'DO');
    branch = Blockly.Python.addLoopTrap(branch, block) || Blockly.Python.PASS;
    const loopVar = Blockly.Python.nameDB_.getDistinctName('count', Blockly.VARIABLE_CATEGORY_NAME);
    const code = `for ${loopVar} in range(${repeats}):\n${branch}`;
    return code;
};

// while/untilブロック
Blockly.Python['controls_whileUntil'] = function(block) {
    const until = block.getFieldValue('MODE') === 'UNTIL';
    const argument0 = Blockly.Python.valueToCode(block, 'BOOL',
        until ? Blockly.Python.ORDER_LOGICAL_NOT : Blockly.Python.ORDER_NONE) || 'False';
    let branch = Blockly.Python.statementToCode(block, 'DO');
    branch = Blockly.Python.addLoopTrap(branch, block) || Blockly.Python.PASS;
    const condition = until ? `not ${argument0}` : argument0;
    const code = `while ${condition}:\n${branch}`;
    return code;
};

// forブロック
Blockly.Python['controls_for'] = function(block) {
    const variable0 = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
    const argument0 = Blockly.Python.valueToCode(block, 'FROM', Blockly.Python.ORDER_NONE) || '0';
    const argument1 = Blockly.Python.valueToCode(block, 'TO', Blockly.Python.ORDER_NONE) || '0';
    const increment = Blockly.Python.valueToCode(block, 'BY', Blockly.Python.ORDER_NONE) || '1';
    let branch = Blockly.Python.statementToCode(block, 'DO');
    branch = Blockly.Python.addLoopTrap(branch, block) || Blockly.Python.PASS;

    const startVar = Blockly.Python.nameDB_.getDistinctName('__start', Blockly.VARIABLE_CATEGORY_NAME);
    const endVar = Blockly.Python.nameDB_.getDistinctName('__end', Blockly.VARIABLE_CATEGORY_NAME);
    const stepVar = Blockly.Python.nameDB_.getDistinctName('__step', Blockly.VARIABLE_CATEGORY_NAME);

    let code = '';
    code += `${startVar} = ${argument0}\n`;
    code += `${endVar} = ${argument1}\n`;
    code += `${stepVar} = ${increment}\n`;
    code += `for ${variable0} in range(${startVar}, ${endVar} + 1 if ${stepVar} >= 0 else ${endVar} - 1, ${stepVar}):\n${branch}`;
    return code;
};


// ════════════════════════════════════════════════════════
// 変数ブロック
// ════════════════════════════════════════════════════════

// 変数取得ブロック
Blockly.Python['variables_get'] = function(block) {
    const code = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
    return [code, Blockly.Python.ORDER_ATOMIC];
};

// 変数代入ブロック
Blockly.Python['variables_set'] = function(block) {
    const argument0 = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
    const varName = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
    const code = `${varName} = ${argument0}\n`;
    return code;
};

// 変数増減ブロック
Blockly.Python['math_change'] = function(block) {
    const argument0 = Blockly.Python.valueToCode(block, 'DELTA', Blockly.Python.ORDER_ADDITIVE) || '1';
    const varName = Blockly.Python.nameDB_.getName(block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
    const code = `${varName} = ${varName} + (${argument0})\n`;
    return code;
};


// ════════════════════════════════════════════════════════
// 数学ブロック
// ════════════════════════════════════════════════════════

// 数値ブロック
Blockly.Python['math_number'] = function(block) {
    const code = Number(block.getFieldValue('NUM'));
    const order = code >= 0 ? Blockly.Python.ORDER_ATOMIC : Blockly.Python.ORDER_UNARY_SIGN;
    return [code, order];
};

// 算術演算ブロック
Blockly.Python['math_arithmetic'] = function(block) {
    const OPERATORS = {
        'ADD': [' + ', Blockly.Python.ORDER_ADDITIVE],
        'MINUS': [' - ', Blockly.Python.ORDER_ADDITIVE],
        'MULTIPLY': [' * ', Blockly.Python.ORDER_MULTIPLICATIVE],
        'DIVIDE': [' / ', Blockly.Python.ORDER_MULTIPLICATIVE],
        'POWER': [' ** ', Blockly.Python.ORDER_EXPONENTIATION]
    };
    const tuple = OPERATORS[block.getFieldValue('OP')];
    const operator = tuple[0];
    const order = tuple[1];
    const argument0 = Blockly.Python.valueToCode(block, 'A', order) || '0';
    const argument1 = Blockly.Python.valueToCode(block, 'B', order) || '0';
    const code = argument0 + operator + argument1;
    return [code, order];
};

// 単項演算ブロック
Blockly.Python['math_single'] = function(block) {
    const operator = block.getFieldValue('OP');
    let code;
    let arg;
    if (operator === 'NEG') {
        arg = Blockly.Python.valueToCode(block, 'NUM', Blockly.Python.ORDER_UNARY_SIGN) || '0';
        code = `-${arg}`;
        return [code, Blockly.Python.ORDER_UNARY_SIGN];
    }
    Blockly.Python.definitions_['import_math'] = 'import math';
    arg = Blockly.Python.valueToCode(block, 'NUM', Blockly.Python.ORDER_NONE) || '0';

    switch (operator) {
        case 'ABS':
            code = `abs(${arg})`;
            break;
        case 'ROOT':
            code = `math.sqrt(${arg})`;
            break;
        case 'LN':
            code = `math.log(${arg})`;
            break;
        case 'LOG10':
            code = `math.log10(${arg})`;
            break;
        case 'EXP':
            code = `math.exp(${arg})`;
            break;
        case 'POW10':
            code = `pow(10, ${arg})`;
            break;
        case 'ROUND':
            code = `round(${arg})`;
            break;
        case 'ROUNDUP':
            code = `math.ceil(${arg})`;
            break;
        case 'ROUNDDOWN':
            code = `math.floor(${arg})`;
            break;
        case 'SIN':
            code = `math.sin(${arg} / 180.0 * math.pi)`;
            break;
        case 'COS':
            code = `math.cos(${arg} / 180.0 * math.pi)`;
            break;
        case 'TAN':
            code = `math.tan(${arg} / 180.0 * math.pi)`;
            break;
    }
    if (code) {
        return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    }
    return [arg, Blockly.Python.ORDER_ATOMIC];
};

// 三角関数ブロック
Blockly.Python['math_trig'] = function(block) {
    Blockly.Python.definitions_['import_math'] = 'import math';
    const operator = block.getFieldValue('OP');
    const arg = Blockly.Python.valueToCode(block, 'NUM', Blockly.Python.ORDER_NONE) || '0';
    let code;
    switch (operator) {
        case 'SIN':
            code = `math.sin(${arg} / 180.0 * math.pi)`;
            break;
        case 'COS':
            code = `math.cos(${arg} / 180.0 * math.pi)`;
            break;
        case 'TAN':
            code = `math.tan(${arg} / 180.0 * math.pi)`;
            break;
        case 'ASIN':
            code = `math.asin(${arg}) / math.pi * 180`;
            break;
        case 'ACOS':
            code = `math.acos(${arg}) / math.pi * 180`;
            break;
        case 'ATAN':
            code = `math.atan(${arg}) / math.pi * 180`;
            break;
        default:
            code = '0';
    }
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};


// ════════════════════════════════════════════════════════
// カスタムブロック
// ════════════════════════════════════════════════════════

// スリープブロック（常に非同期）
Blockly.Python['sleep'] = function(block) {
    const duration = Blockly.Python.valueToCode(block, 'DURATION', Blockly.Python.ORDER_NONE) || '1';

    Blockly.Python.definitions_['import_uasyncio'] = 'import uasyncio';

    const code = `await uasyncio.sleep(${duration})\n`;
    return code;
};

// 最初だけ実行するブロック（非同期セットアップ）
Blockly.Python['setup_block'] = function(block) {
    var innerBlock = block.getInputTargetBlock('DO');
    if (!innerBlock) return '';
    return Blockly.Python.blockToCode(innerBlock);
};

// ずっと実行するブロック（非同期ループ）
Blockly.Python['forever_loop'] = function(block) {
    var branch = Blockly.Python.statementToCode(block, 'DO') || Blockly.Python.PASS;

    // ループ本体に明示的なsleepが含まれているかチェック
    var hasSleep = branch.indexOf('uasyncio.sleep') !== -1;

    var code = 'while True:\n' + branch;
    if (hasSleep) {
        // 明示的なsleepがある場合は最小限のyieldのみ
        code += '  await uasyncio.sleep_ms(10)\n';
    } else {
        // sleepがない場合は安定動作のため100msの待機を挿入
        code += '  await uasyncio.sleep_ms(100)\n';
    }
    return code;
};

// ════════════════════════════════════════════════════════
// テキスト
// ════════════════════════════════════════════════════════

// テキストリテラル
Blockly.Python['text'] = function(block) {
    var text = block.getFieldValue('TEXT') || '';
    text = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return ["'" + text + "'", Blockly.Python.ORDER_ATOMIC];
};

// テキスト結合
Blockly.Python['text_join'] = function(block) {
    var a = Blockly.Python.valueToCode(block, 'A', Blockly.Python.ORDER_ADDITIVE) || "''";
    var b = Blockly.Python.valueToCode(block, 'B', Blockly.Python.ORDER_ADDITIVE) || "''";
    var code = 'str(' + a + ') + str(' + b + ')';
    return [code, Blockly.Python.ORDER_ADDITIVE];
};

// テキストの長さ
Blockly.Python['text_length'] = function(block) {
    var text = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || "''";
    var code = 'len(str(' + text + '))';
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};

//シリアル通信

//プリント
Blockly.Python['print'] = function(block) {
    const value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || "''";

    const code = `print(${value})\n`;
    return code;
}

//出力

//オンボードLED制御
Blockly.Python['led_control'] = function(block) {
    const state = block.getFieldValue('STATE'); //1(on),0(off)

    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin';
    Blockly.Python.definitions_['led_pin_setup'] = 'led = Pin("LED",Pin.OUT)';

    const code = `led.value(${state})\n`;
    return code;
};

//デジタル出力
Blockly.Python['digital_write'] = function(block) {
    const pin = block.getFieldValue('PIN');
    const value = block.getFieldValue('VALUE');

    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin';
    Blockly.Python.definitions_[`pin_${pin}_setup`] = `pin_${pin} = Pin(${pin},Pin.OUT)`;

    const code = `pin_${pin}.value(${value})\n`;
    return code;
}

//アナログ出力
Blockly.Python['analog_write'] = function(block) {
    const pin = block.getFieldValue('PIN');
    const value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';

    Blockly.Python.definitions_['import_machine_pwm'] = 'from machine import Pin, PWM';
    Blockly.Python.definitions_[`pwm_${pin}_setup`] = `pwm_${pin} = PWM(Pin(${pin}))\npwm_${pin}.freq(1000)`;

    const code = `pwm_${pin}.duty_u16(int(${value}))\n`;
    return code;
}

//入力

//デジタル入力
Blockly.Python['digital_read'] = function(block) {
    const pin = block.getFieldValue('PIN');

    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin';
    Blockly.Python.definitions_[`pin_in_${pin}_setup`] = `pin_in_${pin} = Pin(${pin},Pin.IN)`;

    const code = `pin_in_${pin}.value()`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
}

//アナログ入力
Blockly.Python['analog_read'] = function(block) {
    const pin = block.getFieldValue('PIN');

    Blockly.Python.definitions_['import_machine_adc'] = 'from machine import Pin, ADC';
    Blockly.Python.definitions_[`adc_${pin}_setup`] = `adc_${pin} = ADC(Pin(${pin}))`;

    const code = `adc_${pin}.read_u16()`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
}

//アナログ出力 パーセント
Blockly.Python['analog_write_percent'] = function(block) {
    const pin = block.getFieldValue('PIN');
    const percent = Blockly.Python.valueToCode(block, 'PERCENT',Blockly.Python.ORDER_NONE) || '0';

    Blockly.Python.definitions_['import_machine_pwm'] = 'from machine import Pin, PWM';
    Blockly.Python.definitions_[`pwm_${pin}_setup`] = `pwm_${pin} = PWM(Pin(${pin}))\npwm_${pin}.freq(1000)`;

    const code = `pwm_${pin}.duty_u16(int((${percent}) * 655.35))\n`;
    return code;
}

// グラフ

// グラフにデータを追加
Blockly.Python['graph_add_data'] = function(block) {
    var label = block.getFieldValue('LABEL') || 'data';
    var value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';

    var code = 'print(\'__GRAPH__:' + label + ':\' + str(' + value + '))\n';
    return code;
};

// ════════════════════════════════════════════════════════
// カスタムブロック（Raspberry Pi Pico用）の例
// ════════════════════════════════════════════════════════

// デジタル出力ブロック
/*
Blockly.Python['pico_digital_write'] = function(block) {
    const pin = block.getFieldValue('PIN');
    const value = block.getFieldValue('VALUE');

    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin';
    Blockly.Python.definitions_[`pin_${pin}_setup`] = `pin_${pin} = Pin(${pin}, Pin.OUT)`;

    const code = `pin_${pin}.value(${value})\n`;
    return code;
};
*/

// デジタル入力ブロック
/*
Blockly.Python['pico_digital_read'] = function(block) {
    const pin = block.getFieldValue('PIN');

    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin';
    Blockly.Python.definitions_[`pin_${pin}_setup`] = `pin_${pin} = Pin(${pin}, Pin.IN)`;

    const code = `pin_${pin}.value()`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};
*/

// LED点滅ブロック
/*
Blockly.Python['pico_led_blink'] = function(block) {
    const pin = block.getFieldValue('PIN');
    const duration = Blockly.Python.valueToCode(block, 'DURATION', Blockly.Python.ORDER_NONE) || '0.5';

    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin';
    Blockly.Python.definitions_['import_time'] = 'import time';
    Blockly.Python.definitions_[`pin_${pin}_setup`] = `pin_${pin} = Pin(${pin}, Pin.OUT)`;

    const code = `pin_${pin}.on()\ntime.sleep(${duration})\npin_${pin}.off()\n`;
    return code;
};
*/

// PWM制御ブロック
/*
Blockly.Python['pico_pwm'] = function(block) {
    const pin = block.getFieldValue('PIN');
    const duty = Blockly.Python.valueToCode(block, 'DUTY', Blockly.Python.ORDER_NONE) || '512';

    Blockly.Python.definitions_['import_machine_pwm'] = 'from machine import Pin, PWM';
    Blockly.Python.definitions_[`pwm_${pin}_setup`] = `pwm_${pin} = PWM(Pin(${pin}))`;

    const code = `pwm_${pin}.duty_u16(${duty})\n`;
    return code;
};
*/
