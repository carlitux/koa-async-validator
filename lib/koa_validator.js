'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _validator = require('validator');

var _validator2 = _interopRequireDefault(_validator);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
  if ((typeof input === 'undefined' ? 'undefined' : _typeof(input)) === 'object' && input !== null && input.toString) {
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

var ValidatorChain = function ValidatorChain(param, failMsg, req, location, options) {
  _classCallCheck(this, ValidatorChain);

  this.errorFormatter = options.errorFormatter;
  this.param = param;
  this.value = location ? _lodash2.default.get(req[location], param) : undefined;
  this.validationErrors = [];
  this.failMsg = failMsg;
  this.req = req;
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

var Sanitizer = function Sanitizer(param, req, locations) {
  _classCallCheck(this, Sanitizer);

  this.values = locations.map(function (location) {
    return _lodash2.default.get(req[location], param);
  });

  this.req = req;
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
  var _this = this;

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
    if (this.lastError) {
      if (this.lastError.isAsync) {
        this.req._asyncValidationErrors.pop().catch(function () {
          // Suppress errors from original promise - they should go to the new one.
          // Otherwise bluebird throws an 'unhandled rejection' error
        });
        var error = formatErrors.call(this.lastError.context, this.lastError.param, message, this.lastError.value);

        var promise = this.lastError.promise.catch(function () {
          return Promise.reject(error);
        });

        this.req._asyncValidationErrors.push(promise);
      } else {
        this.validationErrors.pop();
        this.req._validationErrors.pop();
        var errorMessage = formatErrors.call(this, this.lastError.param, message, this.lastError.value);
        this.validationErrors.push(errorMessage);
        this.req._validationErrors.push(errorMessage);
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

  return function _callee(ctx, next) {
    var locations, req;
    return regeneratorRuntime.async(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            locations = ['body', 'params', 'query'];
            req = ctx.req;


            ctx._validationErrors = [];

            ctx.validationErrors = function (mapped) {
              if (mapped && ctx._validationErrors.length > 0) {
                var errors = {};
                ctx._validationErrors.forEach(function (err) {
                  errors[err.param] = err;
                });

                return errors;
              }

              return ctx._validationErrors.length > 0 ? ctx._validationErrors : false;
            };

            locations.forEach(function (location) {
              ctx['sanitize' + _lodash2.default.capitalize(location)] = function (param) {
                return new Sanitizer(param, req, [location]);
              };
            });

            ctx.sanitizeHeaders = function (param) {
              if (param === 'referrer') {
                param = 'referer';
              }

              return new Sanitizer(param, req, ['headers']);
            };

            ctx.sanitize = function (param) {
              return new Sanitizer(param, req, locations);
            };

            locations.forEach(function (location) {
              ctx['check' + _lodash2.default.capitalize(location)] = function (param, failMsg) {
                if (_lodash2.default.isPlainObject(param)) {
                  return validateSchema(param, req, location, options);
                }
                return new ValidatorChain(param, failMsg, req, location, options);
              };
            });

            ctx.checkFiles = function (param, failMsg) {
              return new ValidatorChain(param, failMsg, req, 'files', options);
            };

            ctx.checkHeaders = function (param, failMsg) {
              if (param === 'referrer') {
                param = 'referer';
              }

              return new ValidatorChain(param, failMsg, req, 'headers', options);
            };

            ctx.check = function (param, failMsg) {
              if (_lodash2.default.isPlainObject(param)) {
                return validateSchema(param, req, 'any', options);
              }
              return new ValidatorChain(param, failMsg, req, locate(req, param), options);
            };

            ctx.filter = ctx.sanitize;
            ctx.assert = ctx.check;
            ctx.validate = ctx.check;

            _context.next = 16;
            return regeneratorRuntime.awrap(next());

          case 16:
          case 'end':
            return _context.stop();
        }
      }
    }, null, _this);
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

function validateSchema(schema, req, loc, options) {
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

    currentLoc = currentLoc === 'any' ? locate(req, param) : currentLoc;
    var validator = new ValidatorChain(param, null, req, currentLoc, options);
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
  return function _callee2() {
    var args,
        result,
        isValid,
        error,
        _args2 = arguments;
    return regeneratorRuntime.async(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!this.skipValidating) {
              _context2.next = 2;
              break;
            }

            return _context2.abrupt('return', this);

          case 2:
            args = [];

            args.push(this.value);
            args = args.concat(Array.prototype.slice.call(_args2));

            result = container[methodName].apply(container, args);

            console.log(container, args);
            console.log(result);

            if (!result.then) {
              _context2.next = 14;
              break;
            }

            _context2.next = 11;
            return regeneratorRuntime.awrap(result);

          case 11:
            _context2.t0 = _context2.sent;
            _context2.next = 15;
            break;

          case 14:
            _context2.t0 = result;

          case 15:
            isValid = _context2.t0;
            error = formatErrors.call(this, this.param, this.failMsg || 'Invalid value', this.value);


            if (!isValid) {
              this.validationErrors.push(error);
              this.ctx._validationErrors.push(error);
              this.lastError = { param: this.param, value: this.value, isAsync: false };
            } else {
              this.lastError = null;
            }

            return _context2.abrupt('return', this);

          case 19:
          case 'end':
            return _context2.stop();
        }
      }
    }, null, this);
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

        _lodash2.default.set(this.req[this.locations[i]], this.param, result);
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

function locate(req, name) {
  if (_lodash2.default.get(req.params, name)) {
    return 'params';
  } else if (_lodash2.default.has(req.query, name)) {
    return 'query';
  } else if (_lodash2.default.has(req.body, name)) {
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
