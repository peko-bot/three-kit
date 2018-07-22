module.exports = {
    'env': {
        'browser': true,
        'es6': true
    },
    'extends': 'eslint:recommended',
    'parserOptions': {
        'ecmaVersion': 2015,
        'sourceType': 'module'
    },
    'parser': 'babel-eslint',
    'rules': {
        'indent': ['error', 'tab', {
            'SwitchCase': 1,
        }],
        'linebreak-style': [
            'error',
            'windows'
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'always'
        ],
        'no-unused-vars': 0,
        'no-undef': 0, // 不能有未定义的变量
        'no-mixed-spaces-and-tabs': 0,
        'camelcase': 2, // 是否驼峰命名
        'no-console': 0, // 不允许出现console
        'space-in-parens': [2, 'never'], // 小括号里面要不要有空格
        'space-before-function-paren': [2, 'never'], // 函数定义时括号前面要不要有空格
        'default-case': 2, // switch语句最后必须有default
        'brace-style': ['error', '1tbs', { 'allowSingleLine': true }], // 花括号风格，允许一个块打开和关闭括号在同一行上
        'no-delete-var': 2, // 不能对var声明的变量使用delete操作符
        'no-dupe-keys': 2, // 在创建对象字面量时不允许键重复 { a: 1, a: 1 }
        'no-dupe-args': 2, // 函数参数不能重复
        'no-else-return': 2, // 如果if语句里面有return,后面不能跟else语句
        'no-eval': 2, // 禁止使用eval
        'no-extra-bind': 2, // 禁止不必要的函数绑定
        'no-implied-eval': 2, // 禁止使用隐式eval
        'no-invalid-regexp': 2, // 禁止无效的正则表达式
        'no-irregular-whitespace': 2, // 不能有不规则的空格
        'no-lonely-if': 2, // 禁止else语句内只有if语句
        'no-multiple-empty-lines': [1, { 'max': 2 }], // 空行最多不能超过2行
        'no-proto': 2, // 禁止使用__proto__属性
        'no-redeclare': 2, // 禁止重复声明变量
        'no-sparse-arrays': 2, // 禁止稀疏数组， [1,,2]
        'no-trailing-spaces': 2, // 一行结束后面不要有空格
        'no-unexpected-multiline': 2, // 避免多行表达式
        'no-underscore-dangle': 2, // 标识符不能以_开头或结尾
        'no-unneeded-ternary': 2, // 禁止不必要的嵌套 var isYes = answer === 1 ? true : false;
        'no-useless-call': 2, // 禁止不必要的call和apply
        'arrow-spacing': 2, // =>的前/后括号
        'comma-spacing': 2, // 逗号前后的空格
        'comma-style': [2, 'last'], // 逗号风格，换行时在行首还是行尾
        'key-spacing': [0, { 'beforeColon': false, 'afterColon': true }], // 对象字面量中冒号的前后空格
        'newline-after-var': 2, // 变量声明后是否需要空一行
        'object-curly-spacing': [2, 'always'], // 花括号内前后自动加空格
        'space-before-function-paren': [2, 'always'], // 函数定义时括号前面要不要有空格
        'wrap-iife': [2, 'inside'], // 立即执行函数表达式的小括号风格
        'use-isnan': 2, // 禁止比较时使用NaN，只能用isNaN()
        'yoda': [2, 'never'], // 禁止尤达条件
        // 'no-magic-numbers': ['error', { // 禁止出现含义不明确的数字
        //     'ignoreArrayIndexes': true,
        //     'ignore': [0, 1]
        // }]
        'prefer-arrow-callback': 2, // 优先使用箭头函数
        'no-empty': 0, // 是否能写空对象{}
    }
};

// ./node_modules/.bin/eslint . --fix