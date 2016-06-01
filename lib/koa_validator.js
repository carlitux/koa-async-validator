'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _validator = require('validator');

var _validator2 = _interopRequireDefault(_validator);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// When validator upgraded to v5, they removed automatic string coercion
// The next few methods (up to validator.init()) restores that functionality
// so that koa-async-validator can continue to function normally
_validator2.default.extend = function (name, fn) {
  _validator2.default[name] = function () {
    var args = Array.prototype.slice.call(arguments);
    args[0] = _validator2.default.toString(args[0]);
    return fn.apply(_validator2.default, args);
  };
};

_validator2.default.init = function () {
  for (var name in _validator2.default) {
    if (typeof _validator2.default[name] !== 'function' || name === 'toString' || name === 'toDate' || name === 'extend' || name === 'init' || name === 'isServerSide') {
      continue;
    }
    _validator2.default.extend(name, _validator2.default[name]);
  }
};

_validator2.default.toString = function (input) {
  if ((typeof input === 'undefined' ? 'undefined' : (0, _typeof3.default)(input)) === 'object' && input !== null && input.toString) {
    input = input.toString();
  } else if (input === null || typeof input === 'undefined' || isNaN(input) && !input.length) {
    input = '';
  }
  return '' + input;
};

_validator2.default.toDate = function (date) {
  if (Object.prototype.toString.call(date) === '[object Date]') {
    return date;
  }
  date = Date.parse(date);
  return !isNaN(date) ? new Date(date) : null;
};

_validator2.default.init();

// validators and sanitizers not prefixed with is/to
var additionalValidators = ['contains', 'equals', 'matches'];
var additionalSanitizers = ['trim', 'ltrim', 'rtrim', 'escape', 'stripLow', 'whitelist', 'blacklist', 'normalizeEmail'];

/**
 * Initializes a chain of validators
 *
 * @class
 * @param  {(string|string[])}  param         path to property to validate
 * @param  {string}             failMsg       validation failure message
 * @param  {Request}            req           request to attach validation errors
 * @param  {string}             location      request property to find value (body, params, query, etc.)
 * @param  {object}             options       options containing error formatter
 */

var ValidatorChain = function ValidatorChain(param, failMsg, ctx, location, options) {
  (0, _classCallCheck3.default)(this, ValidatorChain);

  var context = location === 'body' ? ctx.request[location] : ctx[location];
  this.errorFormatter = options.errorFormatter;
  this.param = param;
  this.value = location ? _lodash2.default.get(context, param) : undefined;
  this.validationErrors = [];
  this.failMsg = failMsg;
  this.ctx = ctx;
  this.lastError = null; // used by withMessage to get the values of the last error
  return this;
};

/**
 * Initializes a sanitizer
 *
 * @class
 * @param  {(string|string[])}  param    path to property to sanitize
 * @param  {[type]}             req             request to sanitize
 * @param  {[type]}             location        request property to find value
 */

var Sanitizer = function Sanitizer(param, ctx, locations) {
  (0, _classCallCheck3.default)(this, Sanitizer);

  this.values = locations.map(function (location) {
    var context = location === 'body' ? ctx.request[location] : ctx[location];
    return _lodash2.default.get(context, param);
  });

  this.ctx = ctx;
  this.param = param;
  this.locations = locations;
  return this;
};

/**
 * Adds validation methods to request object via express middleware
 *
 * @method koaValidator
 * @param  {object}         options
 * @return {function}       middleware
 */

var koaValidator = function koaValidator(options) {
  var _this2 = this;

  options = options || {};

  var defaults = {
    customValidators: {},
    customSanitizers: {},
    errorFormatter: function errorFormatter(param, msg, value) {
      return {
        param: param,
        msg: msg,
        value: value
      };
    }
  };

  _lodash2.default.defaults(options, defaults);

  // _.set validators and sanitizers as prototype methods on corresponding chains
  _lodash2.default.forEach(_validator2.default, function (method, methodName) {
    if (methodName.match(/^is/) || _lodash2.default.includes(additionalValidators, methodName)) {
      ValidatorChain.prototype[methodName] = makeValidator(methodName, _validator2.default);
    }

    if (methodName.match(/^to/) || _lodash2.default.includes(additionalSanitizers, methodName)) {
      Sanitizer.prototype[methodName] = makeSanitizer(methodName, _validator2.default);
    }
  });

  ValidatorChain.prototype.notEmpty = function () {
    return this.isLength({
      min: 1
    });
  };

  ValidatorChain.prototype.len = function () {
    return this.isLength.apply(this, arguments);
  };

  ValidatorChain.prototype.optional = function (opts) {
    opts = opts || {};
    // By default, optional checks if the key exists, but the user can pass in
    // checkFalsy: true to skip validation if the property is falsy
    var defaults = {
      checkFalsy: false
    };

    var options = _lodash2.default.assign(defaults, opts);

    if (options.checkFalsy) {
      if (!this.value) {
        this.skipValidating = true;
      }
    } else {
      if (this.value === undefined) {
        this.skipValidating = true;
      }
    }

    return this;
  };

  ValidatorChain.prototype.withMessage = function (message) {
    var _this = this;

    if (this.lastError) {
      if (this.lastError.isAsync) {
        (function () {
          var isValid = _this.ctx._asyncValidationErrors.pop();
          var validate = function _callee() {
            var validated;
            return _regenerator2.default.async(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    validated = false;
                    _context.prev = 1;
                    _context.next = 4;
                    return _regenerator2.default.awrap(isValid());

                  case 4:
                    validated = _context.sent;
                    _context.next = 9;
                    break;

                  case 7:
                    _context.prev = 7;
                    _context.t0 = _context['catch'](1);

                  case 9:
                    if (validated) {
                      _context.next = 11;
                      break;
                    }

                    return _context.abrupt('return', formatErrors.call(_this.lastError.context, _this.lastError.param, message, _this.lastError.value));

                  case 11:
                  case 'end':
                    return _context.stop();
                }
              }
            }, null, _this, [[1, 7]]);
          };

          _this.ctx._asyncValidationErrors.push(validate);
        })();
      } else {
        this.validationErrors.pop();
        this.ctx._validationErrors.pop();
        var errorMessage = formatErrors.call(this, this.lastError.param, message, this.lastError.value);
        this.validationErrors.push(errorMessage);
        this.ctx._validationErrors.push(errorMessage);
        this.lastError = null;
      }
    }

    return this;
  };

  _lodash2.default.forEach(options.customValidators, function (method, customValidatorName) {
    ValidatorChain.prototype[customValidatorName] = makeValidator(customValidatorName, options.customValidators);
  });

  _lodash2.default.forEach(options.customSanitizers, function (method, customSanitizerName) {
    Sanitizer.prototype[customSanitizerName] = makeSanitizer(customSanitizerName, options.customSanitizers);
  });

  return function _callee3(ctx, next) {
    var locations;
    return _regenerator2.default.async(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            locations = ['body', 'params', 'query'];


            ctx._validationErrors = [];
            ctx._asyncValidationErrors = [];

            ctx.validationErrors = function _callee2(mapped) {
              var index, error, errors;
              return _regenerator2.default.async(function _callee2$(_context2) {
                while (1) {
                  switch (_context2.prev = _context2.next) {
                    case 0:
                      if (!(ctx._asyncValidationErrors.length > 0)) {
                        _context2.next = 10;
                        break;
                      }

                      _context2.t0 = _regenerator2.default.keys(ctx._asyncValidationErrors);

                    case 2:
                      if ((_context2.t1 = _context2.t0()).done) {
                        _context2.next = 10;
                        break;
                      }

                      index = _context2.t1.value;
                      _context2.next = 6;
                      return _regenerator2.default.awrap(ctx._asyncValidationErrors[index]());

                    case 6:
                      error = _context2.sent;

                      if (error) {
                        ctx._validationErrors.push(error);
                      }
                      _context2.next = 2;
                      break;

                    case 10:
                      if (!(mapped && ctx._validationErrors.length > 0)) {
                        _context2.next = 14;
                        break;
                      }

                      errors = {};

                      ctx._validationErrors.forEach(function (err) {
                        errors[err.param] = err;
                      });

                      return _context2.abrupt('return', errors);

                    case 14:
                      return _context2.abrupt('return', ctx._validationErrors.length > 0 ? ctx._validationErrors : false);

                    case 15:
                    case 'end':
                      return _context2.stop();
                  }
                }
              }, null, this);
            };

            locations.forEach(function (location) {
              ctx['sanitize' + _lodash2.default.capitalize(location)] = function (param) {
                return new Sanitizer(param, ctx, [location]);
              };
            });

            ctx.sanitizeHeaders = function (param) {
              if (param === 'referrer') {
                param = 'referer';
              }

              return new Sanitizer(param, ctx, ['headers']);
            };

            ctx.sanitize = function (param) {
              return new Sanitizer(param, ctx, locations);
            };

            locations.forEach(function (location) {
              ctx['check' + _lodash2.default.capitalize(location)] = function (param, failMsg) {
                if (_lodash2.default.isPlainObject(param)) {
                  return validateSchema(param, ctx, location, options);
                }
                return new ValidatorChain(param, failMsg, ctx, location, options);
              };
            });

            ctx.checkFiles = function (param, failMsg) {
              return new ValidatorChain(param, failMsg, ctx, 'files', options);
            };

            ctx.checkHeaders = function (param, failMsg) {
              if (param === 'referrer') {
                param = 'referer';
              }

              return new ValidatorChain(param, failMsg, ctx, 'headers', options);
            };

            ctx.check = function (param, failMsg) {
              if (_lodash2.default.isPlainObject(param)) {
                return validateSchema(param, ctx, 'any', options);
              }
              return new ValidatorChain(param, failMsg, ctx, locate(ctx, param), options);
            };

            ctx.filter = ctx.sanitize;
            ctx.assert = ctx.check;
            ctx.validate = ctx.check;

            _context3.next = 16;
            return _regenerator2.default.awrap(next());

          case 16:
          case 'end':
            return _context3.stop();
        }
      }
    }, null, _this2);
  };
};

/**
 * validate an object using a schema, using following format:
 *
 * {
 *   paramName: {
 *     validatorName: true,
 *     validator2Name: true
 *   }
 * }
 *
 * Pass options or a custom error message:
 *
 * {
 *   paramName: {
 *     validatorName: {
 *       options: ['', ''],
 *       errorMessage: 'An Error Message'
 *     }
 *   }
 * }
 *
 * @method validateSchema
 * @param  {Object}       schema    schema of validations
 * @param  {Request}      req       request to attach validation errors
 * @param  {string}       location  request property to find value (body, params, query, etc.)
 * @param  {Object}       options   options containing custom validators & errorFormatter
 * @return {object[]}               array of errors
 */

function validateSchema(schema, ctx, loc, options) {
  var locations = ['body', 'params', 'query'],
      currentLoc = loc;

  for (var param in schema) {

    // check if schema has defined location
    if (schema[param].hasOwnProperty('in')) {
      if (locations.indexOf(schema[param].in) !== -1) {
        currentLoc = schema[param].in;
      } else {
        // skip params where defined location is not supported
        continue;
      }
    }

    currentLoc = currentLoc === 'any' ? locate(ctx, param) : currentLoc;
    var validator = new ValidatorChain(param, null, ctx, currentLoc, options);
    var paramErrorMessage = schema[param].errorMessage;
    delete schema[param].errorMessage;

    for (var methodName in schema[param]) {
      if (methodName === 'in') {
        /* Skip method if this is location definition, do not validate it.
          * Restore also the original location that was changed only for this particular param.
            * Without it everything after param with in field would be validated against wrong location.
            */
        currentLoc = loc;
        continue;
      }
      validator.failMsg = schema[param][methodName].errorMessage || paramErrorMessage || 'Invalid param';
      validator[methodName].apply(validator, schema[param][methodName].options);
    }
  }
}

/**
 * Validates and handles errors, return instance of itself to allow for chaining
 *
 * @method makeValidator
 * @param  {string}          methodName
 * @param  {object}          container
 * @return {function}
 */

function makeValidator(methodName, container) {
  return function () {
    var _this3 = this;

    if (this.skipValidating) {
      return this;
    }

    var args = [];
    args.push(this.value);
    args = args.concat(Array.prototype.slice.call(arguments));

    var isValid = container[methodName].apply(container, args);
    var error = formatErrors.call(this, this.param, this.failMsg || 'Invalid value', this.value);

    if (isValid.then) {
      var validate = function _callee4() {
        var validated;
        return _regenerator2.default.async(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                validated = void 0;
                _context4.prev = 1;
                _context4.next = 4;
                return _regenerator2.default.awrap(isValid);

              case 4:
                validated = _context4.sent;
                _context4.next = 10;
                break;

              case 7:
                _context4.prev = 7;
                _context4.t0 = _context4['catch'](1);
                validated = false;

              case 10:
                if (validated) {
                  _context4.next = 12;
                  break;
                }

                return _context4.abrupt('return', error);

              case 12:
              case 'end':
                return _context4.stop();
            }
          }
        }, null, _this3, [[1, 7]]);
      };

      this.lastError = {
        promise: isValid,
        param: this.param,
        value: this.value,
        context: this,
        isAsync: true
      };

      this.ctx._asyncValidationErrors.push(validate);
    } else if (!isValid) {
      this.validationErrors.push(error);
      this.ctx._validationErrors.push(error);
      this.lastError = { param: this.param, value: this.value, isAsync: false };
    } else {
      this.lastError = null;
    }

    return this;
  };
}

/**
 * Sanitizes and sets sanitized value on the request, then return instance of itself to allow for chaining
 *
 * @method makeSanitizer
 * @param  {string}          methodName
 * @param  {object}          container
 * @return {function}
 */

function makeSanitizer(methodName, container) {
  return function () {
    var _arguments = arguments;
    var result;
    this.values.forEach(function (value, i) {
      if (value != null) {
        var args = [value];
        args = args.concat(Array.prototype.slice.call(_arguments));
        result = container[methodName].apply(container, args);

        var location = this.locations[i] === 'body' ? this.ctx.request[this.locations[i]] : this.ctx[this.locations[i]];

        _lodash2.default.set(location, this.param, result);
        this.values[i] = result;
      }
    }.bind(this));

    return result;
  };
}

/**
 * find location of param
 *
 * @method param
 * @param  {Request} req       express request object
 * @param  {(string|string[])} name [description]
 * @return {string}
 */

function locate(ctx, name) {
  if (_lodash2.default.get(ctx.params, name)) {
    return 'params';
  } else if (_lodash2.default.has(ctx.query, name)) {
    return 'query';
  } else if (_lodash2.default.has(ctx.request.body, name)) {
    return 'body';
  }

  return undefined;
}

/**
 * format param output if passed in as array (for nested)
 * before calling errorFormatter
 *
 * @method param
 * @param  {(string|string[])} param       parameter as a string or array
 * @param  {string} msg
 * @param  {string} value
 * @return {function}
 */
function formatErrors(param, msg, value) {
  var formattedParam = formatParamOutput(param);

  return this.errorFormatter(formattedParam, msg, value);
}

// Convert nested params as array into string for output
// Ex: ['users', '0', 'fields', 'email'] to 'users[0].fields.email'
function formatParamOutput(param) {
  if (Array.isArray(param)) {
    param = param.reduce(function (prev, curr) {
      var part = '';
      if (_validator2.default.isInt(curr)) {
        part = '[' + curr + ']';
      } else {
        if (prev) {
          part = '.' + curr;
        } else {
          part = curr;
        }
      }

      return prev + part;
    });
  }

  return param;
}

module.exports = koaValidator;
module.exports.validator = _validator2.default;
module.exports.utils = {
  formatParamOutput: formatParamOutput
};
