"use strict";

var _validator = _interopRequireDefault(require("validator"));

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// When validator upgraded to v5, they removed automatic string coercion
// The next few methods (up to validator.init()) restores that functionality
// so that koa-async-validator can continue to function normally
_validator.default.extend = function (name, fn) {
  _validator.default[name] = function () {
    var args = Array.prototype.slice.call(arguments);
    args[0] = _validator.default.toString(args[0]);
    return fn.apply(_validator.default, args);
  };
};

_validator.default.init = function () {
  for (var name in _validator.default) {
    if (typeof _validator.default[name] !== 'function' || name === 'toString' || name === 'toDate' || name === 'extend' || name === 'init' || name === 'isServerSide') {
      continue;
    }

    _validator.default.extend(name, _validator.default[name]);
  }
};

_validator.default.toString = function (input) {
  if (typeof input === 'object' && input !== null && input.toString) {
    input = input.toString();
  } else if (input === null || typeof input === 'undefined' || isNaN(input) && !input.length) {
    input = '';
  }

  return '' + input;
};

_validator.default.toDate = function (date) {
  if (Object.prototype.toString.call(date) === '[object Date]') {
    return date;
  }

  date = Date.parse(date);
  return !isNaN(date) ? new Date(date) : null;
};

_validator.default.init(); // validators and sanitizers not prefixed with is/to


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

class ValidatorChain {
  constructor(param, failMsg, ctx, location, options) {
    let context = location === 'body' ? ctx.request[location] : ctx[location];
    this.errorFormatter = options.errorFormatter;
    this.param = param;
    this.value = location ? _lodash.default.get(context, param) : undefined;
    this.validationErrors = [];
    this.failMsg = failMsg;
    this.ctx = ctx;
    this.lastError = null; // used by withMessage to get the values of the last error

    return this;
  }

}
/**
 * Initializes a sanitizer
 *
 * @class
 * @param  {(string|string[])}  param    path to property to sanitize
 * @param  {[type]}             req             request to sanitize
 * @param  {[type]}             location        request property to find value
 */


class Sanitizer {
  constructor(param, ctx, locations) {
    this.values = locations.map(function (location) {
      let context = location === 'body' ? ctx.request[location] : ctx[location];
      return _lodash.default.get(context, param);
    });
    this.ctx = ctx;
    this.param = param;
    this.locations = locations;
    return this;
  }

}
/**
 * Adds validation methods to request object via express middleware
 *
 * @method koaValidator
 * @param  {object}         options
 * @return {function}       middleware
 */


var koaValidator = function koaValidator(options) {
  options = options || {};
  let defaults = {
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

  _lodash.default.defaults(options, defaults); // _.set validators and sanitizers as prototype methods on corresponding chains


  _lodash.default.forEach(_validator.default, function (method, methodName) {
    if (methodName.match(/^is/) || _lodash.default.includes(additionalValidators, methodName)) {
      ValidatorChain.prototype[methodName] = makeValidator(methodName, _validator.default);
    }

    if (methodName.match(/^to/) || _lodash.default.includes(additionalSanitizers, methodName)) {
      Sanitizer.prototype[methodName] = makeSanitizer(methodName, _validator.default);
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
    opts = opts || {}; // By default, optional checks if the key exists, but the user can pass in
    // checkFalsy: true to skip validation if the property is falsy

    var defaults = {
      checkFalsy: false
    };

    var options = _lodash.default.assign(defaults, opts);

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
        let isValid = this.ctx._asyncValidationErrors.pop();

        let validate =
        /*#__PURE__*/
        function () {
          var _ref = _asyncToGenerator(function* () {
            let validated = false;

            try {
              validated = yield isValid();
            } catch (e) {}

            if (!validated) {
              return formatErrors.call(_this.lastError.context, _this.lastError.param, message, _this.lastError.value);
            }
          });

          return function validate() {
            return _ref.apply(this, arguments);
          };
        }();

        this.ctx._asyncValidationErrors.push(validate);
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

  _lodash.default.forEach(options.customValidators, function (method, customValidatorName) {
    ValidatorChain.prototype[customValidatorName] = makeValidator(customValidatorName, options.customValidators);
  });

  _lodash.default.forEach(options.customSanitizers, function (method, customSanitizerName) {
    Sanitizer.prototype[customSanitizerName] = makeSanitizer(customSanitizerName, options.customSanitizers);
  });

  return (
    /*#__PURE__*/
    function () {
      var _ref2 = _asyncToGenerator(function* (ctx, next) {
        var locations = ['body', 'params', 'query'];
        ctx._validationErrors = [];
        ctx._asyncValidationErrors = [];

        ctx.validationErrors =
        /*#__PURE__*/
        function () {
          var _ref3 = _asyncToGenerator(function* (mapped) {
            if (ctx._asyncValidationErrors.length > 0) {
              for (let index in ctx._asyncValidationErrors) {
                let error = yield ctx._asyncValidationErrors[index]();

                if (error) {
                  ctx._validationErrors.push(error);
                }
              }
            }

            if (mapped && ctx._validationErrors.length > 0) {
              var errors = {};

              ctx._validationErrors.forEach(function (err) {
                errors[err.param] = err;
              });

              return errors;
            }

            return ctx._validationErrors.length > 0 ? ctx._validationErrors : false;
          });

          return function (_x3) {
            return _ref3.apply(this, arguments);
          };
        }();

        locations.forEach(function (location) {
          ctx['sanitize' + _lodash.default.capitalize(location)] = function (param) {
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
          ctx['check' + _lodash.default.capitalize(location)] = function (param, failMsg) {
            if (_lodash.default.isPlainObject(param)) {
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
          if (_lodash.default.isPlainObject(param)) {
            return validateSchema(param, ctx, 'any', options);
          }

          return new ValidatorChain(param, failMsg, ctx, locate(ctx, param), options);
        };

        ctx.filter = ctx.sanitize;
        ctx.assert = ctx.check;
        ctx.validate = ctx.check;
        yield next();
      });

      return function (_x, _x2) {
        return _ref2.apply(this, arguments);
      };
    }()
  );
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

  for (let param in schema) {
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
    if (this.skipValidating) {
      return this;
    }

    var args = [];
    args.push(this.value);
    args = args.concat(Array.prototype.slice.call(arguments));
    container.ctx = this.ctx;
    var isValid = container[methodName].apply(container, args);
    var error = formatErrors.call(this, this.param, this.failMsg || 'Invalid value', this.value);

    if (isValid.then) {
      let validate =
      /*#__PURE__*/
      function () {
        var _ref4 = _asyncToGenerator(function* () {
          let validated;

          try {
            validated = yield isValid;
          } catch (e) {
            validated = false;
          }

          if (!validated) {
            return error;
          }
        });

        return function validate() {
          return _ref4.apply(this, arguments);
        };
      }();

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

      this.lastError = {
        param: this.param,
        value: this.value,
        isAsync: false
      };
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
        let location = this.locations[i] === 'body' ? this.ctx.request[this.locations[i]] : this.ctx[this.locations[i]];

        _lodash.default.set(location, this.param, result);

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
  if (_lodash.default.get(ctx.params, name)) {
    return 'params';
  } else if (_lodash.default.has(ctx.query, name)) {
    return 'query';
  } else if (_lodash.default.has(ctx.request.body, name)) {
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
} // Convert nested params as array into string for output
// Ex: ['users', '0', 'fields', 'email'] to 'users[0].fields.email'


function formatParamOutput(param) {
  if (Array.isArray(param)) {
    param = param.reduce(function (prev, curr) {
      var part = '';

      if (_validator.default.isInt(curr)) {
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
module.exports.validator = _validator.default;
module.exports.utils = {
  formatParamOutput: formatParamOutput
};
