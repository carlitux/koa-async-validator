"use strict";

var _validator = _interopRequireDefault(require("validator"));

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const toString = input => {
  if (typeof input === 'object' && input !== null && input.toString) {
    return input.toString();
  }

  if (input === null || typeof input === 'undefined' || Number.isNaN(input) && !input.length) {
    return '';
  }

  return `${input}`;
}; // validators and sanitizers not prefixed with is/to


const additionalValidators = ['contains', 'equals', 'matches'];
const additionalSanitizers = ['trim', 'ltrim', 'rtrim', 'escape', 'unescape', 'stripLow', 'whitelist', 'blacklist', 'normalizeEmail'];
/**
 * find location of param
 *
 * @method param
 * @param  {Request} req       express request object
 * @param  {(string|string[])} name [description]
 * @return {string}
 */

const locate = (ctx, name) => {
  if (_lodash.default.get(ctx.params, name)) {
    return 'params';
  }

  if (_lodash.default.has(ctx.query, name)) {
    return 'query';
  }

  if (_lodash.default.has(ctx.request.body, name)) {
    return 'body';
  }

  return undefined;
}; // Convert nested params as array into string for output
// Ex: ['users', '0', 'fields', 'email'] to 'users[0].fields.email'


const formatParamOutput = param => {
  if (Array.isArray(param)) {
    return param.reduce((prev, curr) => {
      if (_validator.default.isInt(`${curr}`)) {
        return `${prev}[${curr}]`;
      }

      if (prev) {
        return `${prev}.${curr}`;
      }

      return `${prev}${curr}`;
    });
  }

  return param;
};

const defaultErrorFormatter = (param, msg, value) => ({
  param,
  msg,
  value
});
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
  constructor(param, failMsg, ctx, location, {
    errorFormatter = defaultErrorFormatter,
    skipValidationOnFirstError = false
  }) {
    const context = location === 'body' ? ctx.request[location] : ctx[location];
    this.errorFormatter = errorFormatter;
    this.param = param;
    this.value = location ? _lodash.default.get(context, param) : undefined;
    this.validationErrors = [];
    this.failMsg = failMsg;
    this.ctx = ctx;
    this.skipValidationOnFirstError = skipValidationOnFirstError;
    this.lastError = null; // used by withMessage to get the values of the last error

    return this;
  }

  notEmpty() {
    return this.isLength({
      min: 1
    });
  }

  len(...rest) {
    return this.isLength(...rest);
  }

  optional({
    checkFalsy = false
  } = {}) {
    if (checkFalsy) {
      if (!this.value) {
        this.skipValidating = true;
      }
    } else if (this.value === undefined) {
      this.skipValidating = true;
    }

    return this;
  }

  formatErrors(param, msg, value) {
    const formattedParam = formatParamOutput(param);
    return this.errorFormatter(formattedParam, msg, value);
  }

  withMessage(message) {
    if (this.lastError) {
      if (this.lastError.isAsync) {
        const isValid = this.ctx._asyncValidationErrors.pop();

        const validate = async () => {
          const validated = await isValid();

          if (!validated) {
            return this.formatErrors(this.lastError.param, message, this.lastError.value);
          }

          return undefined;
        };

        this.ctx._asyncValidationErrors.push(validate);
      } else {
        this.validationErrors.pop();

        this.ctx._validationErrors.pop();

        const errorMessage = this.formatErrors(this.lastError.param, message, this.lastError.value);
        this.validationErrors.push(errorMessage);

        this.ctx._validationErrors.push(errorMessage);

        this.lastError = null;
      }
    }

    return this;
  }

}
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


const validateSchema = (schema, ctx, loc, options) => {
  const locations = ['body', 'params', 'query'];
  let currentLoc = loc;
  Object.entries(schema).forEach(([fieldName, constrains]) => {
    // check if schema has defined location
    if (Object.prototype.hasOwnProperty.call(constrains, 'in')) {
      if (locations.indexOf(constrains.in) !== -1) {
        currentLoc = constrains.in;
      } else {
        // skip params where defined location is not supported
        return;
      }
    }

    currentLoc = currentLoc === 'any' ? locate(ctx, fieldName) : currentLoc;
    const validatorChain = new ValidatorChain(fieldName, null, ctx, currentLoc, options);
    const paramErrorMessage = constrains.errorMessage;
    Object.entries(constrains).forEach(([methodName, methodOptions]) => {
      if (methodName === 'errorMessage') {
        return;
      }

      if (methodName === 'in') {
        /* Skip method if this is location definition, do not validate it.
         * Restore also the original location that was changed only for this particular param.
         * Without it everything after param with in field would be validated against wrong location.
         */
        currentLoc = loc;
        return;
      }

      validatorChain.failMsg = methodOptions.errorMessage || paramErrorMessage || 'Invalid param';
      validatorChain[methodName](...(methodOptions.options || []));
    });
  });
};
/**
 * Validates and handles errors, return instance of itself to allow for chaining
 *
 * @method makeValidator
 * @param  {string}          methodName
 * @param  {object}          container
 * @return {function}
 */


const makeValidator = (methodName, container) => function dynamicValidator(...rest) {
  if (this.skipValidating) {
    return this;
  }

  const ctx = container === _validator.default ? undefined : this.ctx;
  const isValid = container[methodName](container === _validator.default ? toString(this.value) : this.value, ...rest, ctx);
  const error = this.formatErrors(this.param, this.failMsg || 'Invalid value', this.value);

  if (isValid.then) {
    const validate = async () => {
      const validated = await isValid;

      if (!validated) {
        return error;
      }

      return undefined;
    };

    this.lastError = {
      promise: isValid,
      param: this.param,
      value: this.value,
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

    if (this.skipValidationOnFirstError) {
      this.skipValidating = true;
    }
  } else {
    this.lastError = null;
  }

  return this;
};
/**
 * Sanitizes and sets sanitized value on the request, then return instance of itself to allow for chaining
 *
 * @method makeSanitizer
 * @param  {string}          methodName
 * @param  {object}          container
 * @return {function}
 */


const makeSanitizer = (methodName, container) => function dynamicSanitizer(...rest) {
  let result;
  this.values.forEach((value, i) => {
    if (value != null) {
      if (methodName === 'toString') {
        result = toString(value, ...rest);
      } else {
        result = container[methodName](value, ...rest);
      }

      const location = this.locations[i] === 'body' ? this.ctx.request[this.locations[i]] : this.ctx[this.locations[i]];

      _lodash.default.set(location, this.param, result);

      this.values[i] = result;
    }
  });
  return result;
};
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
    this.values = locations.map(location => {
      const context = location === 'body' ? ctx.request[location] : ctx[location];
      return _lodash.default.get(context, param);
    });
    this.ctx = ctx;
    this.param = param;
    this.locations = locations;
    return this;
  }

} // _.set validators and sanitizers as prototype methods on corresponding chains


_lodash.default.forEach(_validator.default, (method, methodName) => {
  if (methodName.match(/^is/) || _lodash.default.includes(additionalValidators, methodName)) {
    ValidatorChain.prototype[methodName] = makeValidator(methodName, _validator.default);
  }

  if (methodName.match(/^to/) || _lodash.default.includes(additionalSanitizers, methodName)) {
    Sanitizer.prototype[methodName] = makeSanitizer(methodName, _validator.default);
  }
});
/**
 * Adds validation methods to request object via express middleware
 *
 * @method koaValidator
 * @param  {object}         options
 * @return {function}       middleware
 */


const koaValidator = ({
  customValidators = {},
  customSanitizers = {},
  ...options
} = {}) => {
  _lodash.default.forEach(customValidators, (method, customValidatorName) => {
    ValidatorChain.prototype[customValidatorName] = makeValidator(customValidatorName, customValidators);
  });

  _lodash.default.forEach(customSanitizers, (method, customSanitizerName) => {
    Sanitizer.prototype[customSanitizerName] = makeSanitizer(customSanitizerName, customSanitizers);
  });

  return async (ctx, next) => {
    const locations = ['body', 'params', 'query'];
    ctx._validationErrors = [];
    ctx._asyncValidationErrors = [];

    ctx.validationErrors = async mapped => {
      if (ctx._asyncValidationErrors.length > 0) {
        const errors = await Promise.all(ctx._asyncValidationErrors.map(validate => validate()));
        errors.forEach(error => {
          if (error) {
            ctx._validationErrors.push(error);
          }
        });
      }

      if (mapped && ctx._validationErrors.length > 0) {
        const errors = {};

        ctx._validationErrors.forEach(err => {
          errors[err.param] = err;
        });

        return errors;
      }

      return ctx._validationErrors.length > 0 ? ctx._validationErrors : false;
    }; // Sanitizer setup


    locations.forEach(location => {
      ctx[`sanitize${_lodash.default.capitalize(location)}`] = param => new Sanitizer(param, ctx, [location]);
    });

    ctx.sanitizeHeaders = param => new Sanitizer(param === 'referrer' ? 'referer' : param, ctx, ['headers']);

    ctx.sanitize = param => new Sanitizer(param, ctx, locations); // Validation


    locations.forEach(location => {
      ctx[`check${_lodash.default.capitalize(location)}`] = (param, failMsg) => {
        if (_lodash.default.isPlainObject(param)) {
          return validateSchema(param, ctx, location, options);
        }

        return new ValidatorChain(param, failMsg, ctx, location, options);
      };
    });

    ctx.checkFiles = (param, failMsg) => new ValidatorChain(param, failMsg, ctx, 'files', options);

    ctx.checkHeaders = (param, failMsg) => new ValidatorChain(param === 'referrer' ? 'referer' : param, failMsg, ctx, 'headers', options);

    ctx.check = (param, failMsg) => {
      if (_lodash.default.isPlainObject(param)) {
        return validateSchema(param, ctx, 'any', options);
      }

      return new ValidatorChain(param, failMsg, ctx, locate(ctx, param), options);
    };

    ctx.filter = ctx.sanitize;
    ctx.assert = ctx.check;
    ctx.validate = ctx.check;
    await next();
  };
};

module.exports = koaValidator;
module.exports.validator = _validator.default;
module.exports.utils = {
  formatParamOutput
};
