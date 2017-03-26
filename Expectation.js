var forEach = require('./utils/for-each');
var callItem = require('./utils/call-item');
module.exports = construct;

function construct() {
    var ExpectationFn = Expectation.prototype;
    ExpectationFn = {
        finished: finished,
        not: {},
        pretty: function () {
            var expectation = this;
            return expectation.name + '\n\t#' + (expectation.groupindex + 1) + ' ' + expectation.message;
        },
        valueOf: function () {
            return this.passed;
        },
        then: afterwards(function (expectation) {
            return expectation.valueOf();
        }),
        otherwise: afterwards(function (expectation) {
            return !expectation.valueOf();
        }),
        eitherway: afterwards(function () {
            return true;
        })
    };
    Expectation.defaultPassedMessage = defaultPassedMessage;
    Expectation.defaultPassedNotMessage = defaultPassedNotMessage;
    Expectation.addValidator = function addValidator(name, fn, passedmessage_, failuremessage_) {
        var passedMessage, passedNotMessage;
        if (!passedMessage_) {
            passedMessage = defaultWrapper(defaultPassedMessage);
            passedNotMessage = defaultWrapper(defaultPassedNotMessage);
        } else {
            passedMessage = !passedNotMessage_ ? passedMessage_(defaultPassedMessage) : passedMessage_;
            passedNotMessage = !passedNotMessage_ ? passedMessage_(defaultPassedNotMessage) : passedNotMessage_;
        }
        ExpectationFn[name] = wrapExpector(fn, passedMessage);
        ExpectationFn.not[name] = wrapExpector(negate(fn), passedMessage);
    };
    return Expectation;

    function Expectation(it, a) {
        var expectation = this;
        expectation.it = it;
        expectation.groupindex = it.expectations.length;
        expectation.name = it.name.join(' ');
        expectation.a = a;
        expectation.passed = false;
        expectation.ran = false;
        return expectation;
    }
}

function defaultWrapper(fn) {
    return function (expectation) {
        return fn(expectation.a, expectation.b);
    };
}

function defaultPassedMessage(a, b) {
    return a + ' to be strictly equal to ' + b;
}

function defaultPassedNotMessage(a, b) {
    return a + ' to be strictly equal to ' + b;
}

function finished(passed_, passedMessage) {
    var handlers, passed = !!passed_,
        expectation = this,
        it = expectation.it,
        globl = it.global,
        calls = callItem(expectation),
        expectations = it.expectations,
        message = passedMessage(expectation);
    if (passed) {
        message = 'found ' + message;
        expectations.passed.push(expectation);
        handlers = globl.handlers.passed;
    } else {
        message = 'expected ' + message;
        expectations.failed.push(expectation);
        handlers = globl.handlers.failed;
    }
    expectation.failed = !passed;
    expectations.anyFailed = expectations.anyFailed || !passed;
    expectation.passed = passed;
    expectation.message = message;
    forEach(handlers, calls);
    forEach(globl.handlers.every, calls);
    return expectation;
}

function afterwards(fn) {
    return function (doit) {
        if (fn(this)) {
            if (isString(doit)) {
                log(doit);
            } else {
                doit(this);
            }
        }
        return this;
    };
}

function isString(string) {
    return typeof string === 'string';
}

function wrapExpector(fn, failuremessage) {
    return function (b) {
        var expectation = this;
        if (expectation.ran) {
            throw new Error('expectations can only be run once');
        }
        expectation.ran = true;
        expectation.b = b;
        return expectation.finished(fn(expectation.a, b), passedmessage, failuremessage);
    };
}