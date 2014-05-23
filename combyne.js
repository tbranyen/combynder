!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.combyne=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';
var registerPartial = _dereq_('./shared/register_partial');
var registerFilter = _dereq_('./shared/register_filter');
var map = _dereq_('./shared/map');
var encode = _dereq_('./shared/encode');
var type = _dereq_('./utils/type');
var createObject = _dereq_('./utils/create_object');
_dereq_('./support/array/map');
_dereq_('./support/array/reduce');
var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
var escapes = {
        '\'': '\'',
        '\\': '\\',
        '\r': 'r',
        '\n': 'n',
        '\t': 't',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    };
function escapeValue(value) {
    return value.replace(escaper, function (match) {
        return '\\' + escapes[match];
    });
}
function normalizeIdentifier(identifier) {
    if (identifier === '.') {
        return 'data[\'.\']';
    }
    return 'data' + identifier.split('.').map(function (property) {
        return '[\'' + property + '\']';
    }).join('');
}
function Compiler(tree) {
    this.tree = tree;
    this.string = '';
    var compiledSource = this.process(this.tree.nodes);
    var body = [];
    if (compiledSource) {
        compiledSource = ' + ' + compiledSource;
    }
    if (compiledSource.indexOf('map(') > -1) {
        body.push(createObject, type, map);
    }
    if (compiledSource.indexOf('encode(') > -1) {
        body.push(type, encode);
    }
    body = body.concat(['return \'\'' + compiledSource]).join(';\n');
    this.func = new Function('data', 'partials', 'filters', body);
    this.source = [
        '{',
        '_partials: {},',
        '_filters: {},',
        'registerPartial: ' + registerPartial + ',',
        'registerFilter: ' + registerFilter + ',',
        'render: function(data) {',
        'return ' + this.func + '(data, this._partials, this._filters)',
        '}',
        '}'
    ].join('\n');
}
Compiler.prototype.process = function (nodes) {
    var commands = [];
    nodes.map(function (node) {
        switch (node.type) {
        case 'RawProperty': {
                commands.push(this.compileProperty(node, false));
                break;
            }
        case 'Property': {
                commands.push(this.compileProperty(node, true));
                break;
            }
        case 'ConditionalExpression': {
                commands.push(this.compileConditional(node));
                break;
            }
        case 'LoopExpression': {
                commands.push(this.compileLoop(node));
                break;
            }
        case 'PartialExpression': {
                commands.push(this.compilePartial(node));
                break;
            }
        default: {
                commands.push('\'' + escapeValue(node.value) + '\'');
            }
        }
    }, this);
    return commands.join('+');
};
Compiler.prototype.compileProperty = function (node, encode) {
    var identifier = node.value;
    if (identifier.indexOf('\'') === -1 && identifier.indexOf('"') === -1) {
        identifier = normalizeIdentifier(node.value);
    }
    var value = [
            '(',
            'typeof',
            identifier,
            '===',
            '\'function\'',
            '?',
            encode ? 'encode(' + identifier + '())' : identifier + '()',
            ':',
            encode ? 'encode(' + identifier + ')' : identifier,
            ')'
        ].join(' ');
    value = node.filters.reduce(function (memo, filter) {
        var args = filter.args.length ? ', ' + filter.args.join(', ') : '';
        return 'filters[\'' + filter.value + '\']' + '(' + memo + args + ')';
    }, value);
    return value;
};
Compiler.prototype.compileConditional = function (node) {
    if (node.conditions.length === 0) {
        throw new Error('Missing conditions to if statement.');
    }
    var condition = node.conditions.map(function (condition) {
            switch (condition.type) {
            case 'Identifier': {
                    return normalizeIdentifier(condition.value);
                }
            case 'Not': {
                    return '!';
                }
            case 'Literal': {
                    return condition.value;
                }
            case 'Equality': {
                    return condition.value;
                }
            }
        }).join(' ');
    var els = node.els ? this.process(node.els.nodes) : null;
    var elsif = node.elsif ? this.compileConditional(node.elsif) : null;
    return [
        '(',
        '(',
        condition,
        ')',
        '?',
        this.process(node.nodes),
        ':',
        els || elsif || '\'\'',
        ')'
    ].join('');
};
Compiler.prototype.compileLoop = function (node) {
    var keyVal = [
            node.conditions[3] ? node.conditions[3].value : 'i',
            node.conditions[2] ? node.conditions[2].value : '.'
        ];
    var loop = [
            'map(',
            normalizeIdentifier(node.conditions[0].value),
            ',',
            '\'',
            keyVal[0],
            '\'',
            ',',
            '\'',
            keyVal[1],
            '\'',
            ',',
            'data',
            ',',
            'function(data) {',
            'return ' + this.process(node.nodes, keyVal),
            '}',
            ').join(\'\')'
        ].join('');
    return loop;
};
Compiler.prototype.compilePartial = function (node) {
    return [
        '(',
        'partials[\'' + node.value + '\'].render(',
        node.args.length ? normalizeIdentifier(node.args[0]) : 'null',
        ')',
        ')'
    ].join('');
};
module.exports = Compiler;
},{"./shared/encode":4,"./shared/map":5,"./shared/register_filter":6,"./shared/register_partial":7,"./support/array/map":9,"./support/array/reduce":10,"./utils/create_object":15,"./utils/type":18}],2:[function(_dereq_,module,exports){
'use strict';
var escapeDelimiter = _dereq_('./utils/escape_delimiter');
_dereq_('./support/array/map');
_dereq_('./support/array/some');
function Grammar(delimiters) {
    this.delimiters = delimiters;
    this.internal = [
        makeEntry('START_IF', 'if'),
        makeEntry('ELSE', 'else'),
        makeEntry('ELSIF', 'elsif'),
        makeEntry('END_IF', 'endif'),
        makeEntry('NOT', 'not'),
        makeEntry('EQUALITY', '=='),
        makeEntry('NOT_EQUALITY', '!='),
        makeEntry('GREATER_THAN_EQUAL', '>='),
        makeEntry('GREATER_THAN', '>'),
        makeEntry('LESS_THAN_EQUAL', '<='),
        makeEntry('LESS_THAN', '<'),
        makeEntry('NOT', 'not'),
        makeEntry('START_EACH', 'each'),
        makeEntry('END_EACH', 'endeach'),
        makeEntry('ASSIGN', 'as'),
        makeEntry('PARTIAL', 'partial'),
        makeEntry('MAGIC', '.')
    ];
}
function makeEntry(name, value) {
    var escaped = escapeDelimiter(value);
    return {
        name: name,
        escaped: escaped,
        test: new RegExp('^' + escaped)
    };
}
Grammar.prototype.escape = function () {
    var grammar = [
            'START_RAW',
            'START_PROP',
            'START_EXPR',
            'END_RAW',
            'END_PROP',
            'END_EXPR',
            'COMMENT',
            'FILTER'
        ];
    grammar = grammar.map(function (key) {
        return makeEntry(key, this.delimiters[key]);
    }, this);
    grammar.push.apply(grammar, this.internal);
    var string = grammar.map(function (value) {
            return value.escaped;
        }).join('|');
    grammar.push({
        name: 'WHITESPACE',
        test: /^[\ |\t|\r|\n]+/
    });
    string += '| |\t|\r|\n';
    grammar.push({
        name: 'OTHER',
        test: new RegExp('^((?!' + string + ').)*')
    });
    return grammar;
};
module.exports = Grammar;
},{"./support/array/map":9,"./support/array/some":11,"./utils/escape_delimiter":17}],3:[function(_dereq_,module,exports){
'use strict';
var Grammar = _dereq_('./grammar');
var Tokenizer = _dereq_('./tokenizer');
var Tree = _dereq_('./tree');
var Compiler = _dereq_('./compiler');
var registerPartial = _dereq_('./shared/register_partial');
var registerFilter = _dereq_('./shared/register_filter');
var type = _dereq_('./utils/type');
var defaults = _dereq_('./utils/defaults');
var defaultDelimiters = {
        START_RAW: '{{{',
        END_RAW: '}}}',
        START_PROP: '{{',
        END_PROP: '}}',
        START_EXPR: '{%',
        END_EXPR: '%}',
        COMMENT: '--',
        FILTER: '|'
    };
function Combyne(template, data) {
    if (!(this instanceof Combyne)) {
        return new Combyne(template, data);
    }
    this.template = template;
    this.data = data || {};
    this._partials = {};
    this._filters = {};
    if (type(this.template) !== 'string') {
        throw new Error('Template must be a String.');
    }
    var delimiters = defaults(Combyne.settings.delimiters, defaultDelimiters);
    var grammar = new Grammar(delimiters).escape();
    var stack = new Tokenizer(this.template, grammar).parse();
    var tree = new Tree(stack).make();
    this.tree = tree;
    this.stack = stack;
    this.compiler = new Compiler(tree);
    this.source = this.compiler.source;
}
Combyne.prototype.registerPartial = registerPartial;
Combyne.prototype.registerFilter = registerFilter;
Combyne.settings = {};
Combyne.prototype.render = function (data) {
    this.data = data || this.data;
    return this.compiler.func(this.data, this._partials, this._filters);
};
Combyne.VERSION = '0.3.4';
module.exports = Combyne;
},{"./compiler":1,"./grammar":2,"./shared/register_filter":6,"./shared/register_partial":7,"./tokenizer":13,"./tree":14,"./utils/defaults":16,"./utils/type":18}],4:[function(_dereq_,module,exports){
'use strict';
var type = _dereq_('../utils/type');
function encode(raw) {
    if (type(raw) !== 'string') {
        return raw;
    }
    return raw.replace(/[\u00A0-\u9999<>\&]/gim, function (match) {
        return '&#' + match.charCodeAt(0) + ';';
    });
}
module.exports = encode;
},{"../utils/type":18}],5:[function(_dereq_,module,exports){
'use strict';
var type = _dereq_('../utils/type');
var createObject = _dereq_('../utils/create_object');
_dereq_('../support/array/is_array');
function map(obj, index, value, data, iterator) {
    var isArrayLike = type(obj) === 'arguments' || type(obj) === 'nodelist';
    var isArray = Array.isArray(obj) || isArrayLike;
    var output = [];
    var dataObject;
    if (isArray) {
        obj = [].slice.call(obj);
        for (var i = 0; i < obj.length; i++) {
            dataObject = createObject(data);
            dataObject[index] = i;
            dataObject[value] = obj[i];
            output.push(iterator(dataObject));
        }
        return output;
    } else {
        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            }
            dataObject = createObject(data);
            dataObject[index] = key;
            dataObject[value] = obj[key];
            output.push(iterator(dataObject));
        }
        return output;
    }
}
module.exports = map;
},{"../support/array/is_array":8,"../utils/create_object":15,"../utils/type":18}],6:[function(_dereq_,module,exports){
'use strict';
function registerFilter(name, callback) {
    this._filters[name] = callback;
}
module.exports = registerFilter;
},{}],7:[function(_dereq_,module,exports){
'use strict';
function registerPartial(name, template) {
    this._partials[name] = template;
    this._partials[name]._filters = this._filters;
}
module.exports = registerPartial;
},{}],8:[function(_dereq_,module,exports){
'use strict';
var type = _dereq_('../../utils/type');
if (Array.isArray) {
    return isArray;
}
function isArray(arg) {
    return type(arg) === '[object Array]';
}
module.exports = Array.isArray = isArray;
},{"../../utils/type":18}],9:[function(_dereq_,module,exports){
'use strict';
if (Array.prototype.map) {
    return map;
}
function map(iterator, thisArg) {
    if (this == null) {
        throw new TypeError();
    }
    if (typeof iterator !== 'function') {
        throw new TypeError();
    }
    thisArg = thisArg || this;
    var array = Array.prototype.slice.call(this);
    var retVal = [];
    for (var i = 0; i < array.length; i++) {
        if (i in array) {
            retVal[retVal.length] = iterator.call(thisArg, array[i], i, array);
        }
    }
    return retVal;
}
module.exports = Array.prototype.map = map;
},{}],10:[function(_dereq_,module,exports){
'use strict';
if (Array.prototype.reduce) {
    return reduce;
}
function reduce(iterator, memo) {
    if (this == null) {
        throw new TypeError();
    }
    if (typeof iterator !== 'function') {
        throw new TypeError();
    }
    var array = Array.prototype.slice.call(this);
    for (var i = 0; i < array.length; i++) {
        if (i in array) {
            memo = iterator(memo, array[i], i, array);
        }
    }
    return memo;
}
module.exports = Array.prototype.reduce = reduce;
},{}],11:[function(_dereq_,module,exports){
'use strict';
if (Array.prototype.some) {
    return some;
}
function some(iterator, thisArg) {
    if (this == null) {
        throw new TypeError();
    }
    if (typeof iterator !== 'function') {
        throw new TypeError();
    }
    thisArg = thisArg || this;
    var array = Array.prototype.slice.call(this);
    for (var i = 0; i < array.length; i++) {
        if (i in array) {
            if (iterator.call(thisArg, array[i], i, array)) {
                return true;
            }
        }
    }
    return false;
}
module.exports = Array.prototype.some = some;
},{}],12:[function(_dereq_,module,exports){
'use strict';
if (String.prototype.trim) {
    return trim;
}
function trim() {
    return this.replace(/^\s+|\s+$/g, '');
}
module.exports = String.prototype.trim = trim;
},{}],13:[function(_dereq_,module,exports){
'use strict';
_dereq_('./support/array/some');
function Tokenizer(template, grammar) {
    this.template = template;
    this.grammar = grammar;
    this.stack = [];
}
function parseNextToken(template, grammar, stack) {
    grammar.some(function (token) {
        var capture = token.test.exec(template);
        if (capture && capture[0]) {
            template = template.replace(token.test, '');
            stack.push({
                name: token.name,
                capture: capture
            });
            return true;
        }
    });
    return template;
}
Tokenizer.prototype.parse = function () {
    var template = this.template;
    var grammar = this.grammar;
    var stack = this.stack;
    var stackLen = 0;
    while (template.length) {
        template = parseNextToken(template, grammar, stack);
        stackLen = stack.length;
        if (stackLen - 2 >= 0) {
            stack[stackLen - 1].previous = stack[stackLen - 2];
        }
    }
    return stack;
};
module.exports = Tokenizer;
},{"./support/array/some":11}],14:[function(_dereq_,module,exports){
'use strict';
var isString = /['"]+/;
_dereq_('./support/string/trim');
function Tree(stack) {
    this.stack = stack.slice();
    this.root = {
        type: 'Template',
        nodes: []
    };
}
Tree.prototype.make = function (root, END) {
    root = root || this.root;
    var result;
    while (this.stack.length) {
        var node = this.stack.shift();
        var prev = root.nodes[root.nodes.length - 1];
        switch (node.name) {
        case 'START_RAW': {
                root.nodes.push(this.constructProperty(false));
                break;
            }
        case 'START_PROP': {
                root.nodes.push(this.constructProperty(true));
                break;
            }
        case 'START_EXPR': {
                if (result = this.constructExpression(root, END)) {
                    root.nodes.push(result);
                    break;
                } else if (result !== false) {
                    return null;
                }
                break;
            }
        case 'END_EXPR': {
                break;
            }
        default: {
                var prevWhitespace = '';
                if (prev && prev.type === 'Text') {
                    root.nodes.pop();
                    prevWhitespace = prev.value;
                }
                root.nodes.push({
                    type: 'Text',
                    value: prevWhitespace + node.capture[0]
                });
                break;
            }
        }
    }
    return root;
};
Tree.prototype.constructProperty = function (encoded) {
    var propertyDescriptor = {
            type: encoded ? 'Property' : 'RawProperty',
            value: '',
            filters: []
        };
    while (this.stack.length) {
        var node = this.stack.shift();
        switch (node.name) {
        case 'WHITESPACE': {
                break;
            }
        case 'FILTER': {
                return this.constructFilter(propertyDescriptor);
            }
        case 'END_RAW':
        case 'END_PROP': {
                return propertyDescriptor;
            }
        default: {
                propertyDescriptor.value += node.capture[0].trim();
            }
        }
    }
    throw new Error('Unterminated property.');
};
Tree.prototype.constructPartial = function (root) {
    root.type = 'PartialExpression';
    delete root.nodes;
    root.args = [];
    LOOP:
        while (this.stack.length) {
            var node = this.stack.shift();
            switch (node.name) {
            case 'OTHER': {
                    if (root.value === undefined) {
                        root.value = node.capture[0].trim();
                    } else {
                        root.args.push(node.capture[0].trim());
                    }
                    break;
                }
            case 'WHITESPACE': {
                    break;
                }
            case 'END_EXPR': {
                    break LOOP;
                }
            default: {
                    throw new Error('Unexpected ' + node.name + ' encountered.');
                }
            }
        }
    return root;
};
Tree.prototype.constructFilter = function (root) {
    var current = {
            type: 'Filter',
            args: []
        };
    var previous = {};
    LOOP:
        while (this.stack.length) {
            var node = this.stack.shift();
            switch (node.name) {
            case 'OTHER': {
                    if (current.value === undefined) {
                        current.value = node.capture[0].trim();
                    } else {
                        current.args.push(node.capture[0].trim());
                    }
                    break;
                }
            case 'WHITESPACE': {
                    break;
                }
            case 'END_RAW':
            case 'END_PROP': {
                    root.filters.push(current);
                    break LOOP;
                }
            case 'FILTER': {
                    root.filters.push(current);
                    this.constructFilter(root);
                    break;
                }
            default: {
                    throw new Error('Unexpected ' + node.name + ' encountered.');
                }
            }
            previous = node;
        }
    return root;
};
Tree.prototype.constructEach = function (root) {
    root.type = 'LoopExpression';
    root.conditions = [];
    LOOP:
        while (this.stack.length) {
            var node = this.stack.shift();
            switch (node.name) {
            case 'OTHER': {
                    root.conditions.push({
                        type: 'Identifier',
                        value: node.capture[0].trim()
                    });
                    break;
                }
            case 'ASSIGN': {
                    root.conditions.push({
                        type: 'Assignment',
                        value: node.capture[0].trim()
                    });
                    break;
                }
            case 'END_EXPR': {
                    break LOOP;
                }
            }
        }
    this.make(root, 'END_EACH');
    return root;
};
Tree.prototype.constructComment = function (root) {
    var previous = {};
    while (this.stack.length) {
        var node = this.stack.shift();
        switch (node.name) {
        case 'COMMENT': {
                if (previous.name === 'START_EXPR') {
                    this.constructComment(root);
                    break;
                }
                break;
            }
        case 'END_EXPR': {
                if (previous.name === 'COMMENT') {
                    return false;
                }
                break;
            }
        }
        previous = node;
    }
    return false;
};
Tree.prototype.constructConditional = function (root, kind) {
    root.type = root.type || 'ConditionalExpression';
    root.conditions = root.conditions || [];
    var previous = {};
    if (kind === 'ELSE') {
        root.els = { nodes: [] };
        return this.make(root.els, 'END_IF');
    }
    if (kind === 'ELSIF') {
        root.elsif = { nodes: [] };
        return this.constructConditional(root.elsif);
    }
    LOOP:
        while (this.stack.length) {
            var node = this.stack.shift();
            var value = node.capture[0].trim();
            switch (node.name) {
            case 'NOT': {
                    root.conditions.push({ type: 'Not' });
                    break;
                }
            case 'EQUALITY':
            case 'NOT_EQUALITY':
            case 'GREATER_THAN':
            case 'GREATER_THAN_EQUAL':
            case 'LESS_THAN':
            case 'LESS_THAN_EQUAL': {
                    root.conditions.push({
                        type: 'Equality',
                        value: node.capture[0].trim()
                    });
                    break;
                }
            case 'END_EXPR': {
                    break LOOP;
                }
            case 'WHITESPACE': {
                    break;
                }
            default: {
                    if (value === 'false' || value === 'true') {
                        root.conditions.push({
                            type: 'Literal',
                            value: value
                        });
                        break;
                    } else if (Number(value) === Number(value)) {
                        root.conditions.push({
                            type: 'Literal',
                            value: value
                        });
                    } else if (isString.test(value)) {
                        root.conditions.push({
                            type: 'Literal',
                            value: value
                        });
                        break;
                    } else if (previous.type === 'Identifier') {
                        previous.value += value;
                        break;
                    } else {
                        root.conditions.push({
                            type: 'Identifier',
                            value: value
                        });
                        break;
                    }
                }
            }
            previous = root.conditions[root.conditions.length - 1] || {};
        }
    this.make(root, 'END_IF');
    return root;
};
Tree.prototype.constructExpression = function (root, END) {
    var expressionRoot = { nodes: [] };
    while (this.stack.length) {
        var type = this.stack.shift();
        switch (type.name) {
        case END: {
                return;
            }
        case 'WHITESPACE': {
                break;
            }
        case 'COMMENT': {
                return this.constructComment(expressionRoot);
            }
        case 'START_EACH': {
                return this.constructEach(expressionRoot);
            }
        case 'ELSIF':
        case 'ELSE':
        case 'START_IF': {
                if (type.name !== 'START_IF') {
                    expressionRoot = root;
                }
                return this.constructConditional(expressionRoot, type.name);
            }
        case 'PARTIAL': {
                return this.constructPartial(expressionRoot);
            }
        default: {
                throw new Error('Invalid expression type.');
            }
        }
    }
};
module.exports = Tree;
},{"./support/string/trim":12}],15:[function(_dereq_,module,exports){
'use strict';
function createObject(parent) {
    function F() {
    }
    F.prototype = parent;
    return new F();
}
module.exports = createObject;
},{}],16:[function(_dereq_,module,exports){
'use strict';
function defaults(target, source) {
    target = target || {};
    source = source;
    for (var key in source) {
        if (!source.hasOwnProperty(key)) {
            continue;
        }
        if (!(key in target)) {
            target[key] = source[key];
        }
    }
    return target;
}
module.exports = defaults;
},{}],17:[function(_dereq_,module,exports){
'use strict';
var specialCharsExp = /[\^$\\\/.*+?()\[\]{}|]/g;
function escapeDelimiter(delimiter) {
    return delimiter.replace(specialCharsExp, '\\$&');
}
module.exports = escapeDelimiter;
},{}],18:[function(_dereq_,module,exports){
'use strict';
function type(value) {
    return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}
module.exports = type;
},{}]},{},[3])
(3)
});