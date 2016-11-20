# koa-async-validator

[![npm version](https://badge.fury.io/js/koa-async-validator.svg)](https://badge.fury.io/js/koa-async-validator) [![Build Status](https://secure.travis-ci.org/carlitux/koa-async-validator.png)](http://travis-ci.org/carlitux/koa-async-validator) [![Dependency Status](https://david-dm.org/carlitux/koa-async-validator.svg)](https://david-dm.org/carlitux/koa-async-validator)

An [koa.js]( https://github.com/koajs/koa ) middleware for
[node-validator]( https://github.com/chriso/validator.js ).

## Installation

```
npm install koa-async-validator --save
```

## Important notes

* If you want to use checkParams you have to user koa-router or any router
that populates ctx.params.
* This middleware is for koa 2.

## Usage

```javascript
import util from 'util';
import Koa from 'koa';
import koaValidator from 'koa-async-validator';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';

const app = new Koa();
const router = new Router();

app.use(bodyParser());
app.use(koaValidator([options])); // this line must be immediately after bodyParser()!

router.post('/:urlparam', async (ctx, next) => {

  // VALIDATION
  // checkBody only checks ctx.request.body; none of the other req parameters
  // Similarly checkParams only checks in ctx.params (URL params) and
  // checkQuery only checks ctx.query (GET params).
  ctx.checkBody('postparam', 'Invalid postparam').notEmpty().isInt();
  ctx.checkParams('urlparam', 'Invalid urlparam').isAlpha();
  ctx.checkQuery('getparam', 'Invalid getparam').isInt();

  // OR assert can be used to check on all 3 types of params.
  // ctx.assert('postparam', 'Invalid postparam').notEmpty().isInt();
  // ctx.assert('urlparam', 'Invalid urlparam').isAlpha();
  // ctx.assert('getparam', 'Invalid getparam').isInt();

  // SANITIZATION
  // as with validation these will only validate the corresponding
  // request object
  ctx.sanitizeBody('postparam').toBoolean();
  ctx.sanitizeParams('urlparam').toBoolean();
  ctx.sanitizeQuery('getparam').toBoolean();

  // OR find the relevent param in all areas
  ctx.sanitize('postparam').toBoolean();

  let errors = await ctx.validationErrors();

  if (errors) {
    ctx.body = `There have been validation errors: ${ util.inspect(errors) }`;
    ctx.status = 400;
  } else {
    ctx.body = {
      urlparam: ctx.params.urlparam,
      getparam: ctx.params.getparam,
      postparam: ctx.params.postparam
    }
  }

  await next();
});

app
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(8888);
```

Which will result in:

*Needs to be updated*
```
$ curl -d 'postparam=1' http://localhost:8888/test?getparam=1
{"urlparam":"test","getparam":"1","postparam":true}

$ curl -d 'postparam=1' http://localhost:8888/t1est?getparam=1
There have been validation errors: [
  { param: 'urlparam', msg: 'Invalid urlparam', value: 't1est' } ]

$ curl -d 'postparam=1' http://localhost:8888/t1est?getparam=1ab
There have been validation errors: [
  { param: 'getparam', msg: 'Invalid getparam', value: '1ab' },
  { param: 'urlparam', msg: 'Invalid urlparam', value: 't1est' } ]

$ curl http://localhost:8888/test?getparam=1&postparam=1
There have been validation errors: [
  { param: 'postparam', msg: 'Invalid postparam', value: undefined} ]
```

### Middleware Options
####`errorFormatter`
_function(param,msg,value)_

The `errorFormatter` option can be used to specify a function that can be used to format the objects that populate the error array that is returned in `ctx.validationErrors()`. It should return an `Object` that has `param`, `msg`, and `value` keys defined.

```javascript
// In this example, the formParam value is going to get morphed into form body format useful for printing.
app.use(koaValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));
```

####`customValidators`
_{ "validatorName": function(value, [additional arguments]), ... }_


The `customValidators` option can be used to add additional validation methods as needed. This option should be an `Object` defining the validator names and associated validation functions.

Define your custom validators:

```javascript
app.use(koaValidator({
 customValidators: {
    isArray: function(value) {
        return Array.isArray(value);
    },
    gte: function(param, num) {
        return param >= num;
    }
 }
}));
```
Use them with their validator name:
```javascript
ctx.checkBody('users', 'Users must be an array').isArray();
ctx.checkQuery('time', 'Time must be an integer great than or equal to 5').isInt().gte(5)
```
####`customSanitizers`
_{ "sanitizerName": function(value, [additional arguments]), ... }_

The `customSanitizers` option can be used to add additional sanitizers methods as needed. This option should be an `Object` defining the sanitizer names and associated functions.

Define your custom sanitizers:

```javascript
app.use(koaValidator({
 customSanitizers: {
    toSanitizeSomehow: function(value) {
        var newValue = value;//some operations
        return newValue;
    },
 }
}));
```
Use them with their sanitizer name:
```javascript
ctx.sanitize('address').toSanitizeSomehow();
```

## Validation

#### ctx.check();
```javascript
   ctx.check('testparam', 'Error Message').notEmpty().isInt();
   ctx.check('testparam.child', 'Error Message').isInt(); // find nested params
   ctx.check(['testparam', 'child'], 'Error Message').isInt(); // find nested params
```

Starts the validation of the specifed parameter, will look for the parameter in `req` in the order `params`, `query`, `body`, then validate, you can use 'dot-notation' or an array to access nested values.

If a validator takes in params, you would call it like `ctx.assert('reqParam').contains('thisString');`.

Validators are appended and can be chained. See [chriso/validator.js](https://github.com/chriso/validator.js) for available validators, or [add your own](#customvalidators).

#### ctx.assert();
Alias for [ctx.check()](#reqcheck).

#### ctx.validate();
Alias for [ctx.check()](#reqcheck).

#### ctx.checkBody();
Same as [ctx.check()](#reqcheck), but only looks in `ctx.request.body`.

#### ctx.checkQuery();
Same as [ctx.check()](#reqcheck), but only looks in `ctx.request.query`.

#### ctx.checkParams();
Same as [ctx.check()](#reqcheck), but only looks in `ctx.request.params`.

#### ctx.checkHeaders();
Only checks `ctx.headers`. This method is not covered by the general `ctx.check()`.

## Asynchronous Validation

If you need to perform asynchronous validation, for example checking a database if a username has been taken already, your custom validator can return a promise or the customValidators should be async functions.

If you are using a promise you have to resolve with a boolean to know if is valid or not and reject is used as not valid.

If you are using async you need to return a boolean to know if valid or not and if throw an error should be used as not valid.

 ```javascript
app.use(koaValidator({
  customValidators: {
    isUsernameAvailable: function(username) {
      return new Promise(function(resolve, reject) {
        User.findOne({ username: username })
        .then(function(user) {
          if (user) {
            resolve(user);
          }
          else {
            reject(user);
          }
        })
        .catch(function(error){
          if (error) {
            reject(error);
          }
        });
      });
    }
  }
}));

ctx.check('username', 'Username Taken').isUsernameAvailable();
```

## Validation by Schema

Alternatively you can define all your validations at once using a simple schema. This also enables per-validator error messages.
Schema validation will be used if you pass an object to any of the validator methods.

```javascript
ctx.checkBody({
 'email': {
    notEmpty: true,
    isEmail: {
      errorMessage: 'Invalid Email'
    }
  },
  'password': {
    notEmpty: true,
    matches: {
      options: ['example', 'i'] // pass options to the validator with the options property as an array
      // options: [/example/i] // matches also accepts the full expression in the first parameter
    },
    errorMessage: 'Invalid Password' // Error message for the parameter
  },
  'name.first': { //
    optional: true, // won't validate if field is empty
    isLength: {
      options: [{ min: 2, max: 10 }],
      errorMessage: 'Must be between 2 and 10 chars long' // Error message for the validator, takes precedent over parameter message
    },
    errorMessage: 'Invalid First Name'
  }
});
```

You can also define a specific location to validate against in the schema by adding `in` parameter as shown below:

```javascript
ctx.check({
 'email': {
    in: 'query',
    notEmpty: true,
    isEmail: {
      errorMessage: 'Invalid Email'
    }
  }
});
```

Please remember that the `in` attribute will have always highest priority. This mean if you use `in: 'query'` then checkQuery() will be called inside even if you do `checkParams()` or `checkBody()`. For example, all of these calls will check query params for email param:


```javascript
const schema = {
 'email': {
    in: 'query',
    notEmpty: true,
    isEmail: {
      errorMessage: 'Invalid Email'
    }
  },
  'password': {
    notEmpty: true,
    matches: {
      options: ['example', 'i'] // pass options to the validator with the options property as an array
      // options: [/example/i] // matches also accepts the full expression in the first parameter
    },
    errorMessage: 'Invalid Password' // Error message for the parameter
  }
};

ctx.check(schema);        // will check 'password' no matter where it is but 'email' in query params
ctx.checkQuery(schema);   // will check 'password' and 'email' in query params
ctx.checkBody(schema);    // will check 'password' in body but 'email' in query params
ctx.checkParams(schema);  // will check 'password' in path params but 'email' in query params
```

Currently supported location are `'body', 'params', 'query'`. If you provide a location parameter that is not supported, the validation process for current parameter will be skipped.

## Validation errors

You have two choices on how to get the validation errors:

```javascript
ctx.assert('email', 'required').notEmpty();
ctx.assert('email', 'valid email required').isEmail();
ctx.assert('password', '6 to 20 characters required').len(6, 20);

let errors = ctx.validationErrors();
let mappedErrors = ctx.validationErrors(true);
```

errors:

```javascript
[
  {param: "email", msg: "required", value: "<received input>"},
  {param: "email", msg: "valid email required", value: "<received input>"},
  {param: "password", msg: "6 to 20 characters required", value: "<received input>"}
]
```

mappedErrors:

```javascript
{
  email: {
    param: "email",
    msg: "valid email required",
    value: "<received input>"
  },
  password: {
    param: "password",
    msg: "6 to 20 characters required",
    value: "<received input>"
  }
}
```
*Note: Using mappedErrors will only provide the last error per param in the chain of validation errors.*

### Per-validation messages

You can provide an error message for a single validation with `.withMessage()`. This can be chained with the rest of your validation, and if you don't use it for one of the validations then it will fall back to the default.

```javascript
ctx.assert('email', 'Invalid email')
    .notEmpty().withMessage('Email is required')
    .isEmail();
let errors = ctx.validationErrors();
```
errors:

```javascript
[
  {param: 'email', msg: 'Email is required', value: '<received input>'}
  {param: 'email', msg: 'Invalid Email', value: '<received input>'}
]
```

## Optional input

You can use the `optional()` method to skip validation. By default, it only skips validation if the key does not exist on the request object. If you want to skip validation based on the property being falsy (null, undefined, etc), you can pass in `{ checkFalsy: true }`.

```javascript
ctx.checkBody('email').optional().isEmail();
//if there is no error, ctx.request.body.email is either undefined or a valid mail.
```

## Sanitizer

#### ctx.sanitize();
```javascript

ctx.request.body.comment = 'a <span>comment</span>';
ctx.request.body.username = '   a user    ';

ctx.sanitize('comment').escape(); // returns 'a &lt;span&gt;comment&lt;/span&gt;'
ctx.sanitize('username').trim(); // returns 'a user'

console.log(ctx.request.body.comment); // 'a &lt;span&gt;comment&lt;/span&gt;'
console.log(ctx.request.body.username); // 'a user'

```

Sanitizes the specified parameter (using 'dot-notation' or array), the parameter will be updated to the sanitized result. Cannot be chained, and will return the result. See [chriso/validator.js](https://github.com/chriso/validator.js) for available sanitizers, or [add your own](#customsanitizers).

If a sanitizer takes in params, you would call it like `ctx.sanitize('reqParam').whitelist(['a', 'b', 'c']);`.

If the parameter is present in multiple places with the same name e.g. `ctx.params.comment` & `ctx.query.comment`, they will all be sanitized.

#### ctx.filter();
Alias for [ctx.sanitize()](#reqsanitize).

#### ctx.sanitizeBody();
Same as [ctx.sanitize()](#reqsanitize), but only looks in `ctx.body`.

#### ctx.sanitizeQuery();
Same as [ctx.sanitize()](#reqsanitize), but only looks in `ctx.query`.

#### ctx.sanitizeParams();
Same as [ctx.sanitize()](#reqsanitize), but only looks in `ctx.params`.

#### ctx.sanitizeHeaders();
Only sanitizes `ctx.headers`. This method is not covered by the general `ctx.sanitize()`.

### Regex routes

Express allows you to define regex routes like:

```javascript
app.get(/\/test(\d+)/, function() {});
```

You can validate the extracted matches like this:

```javascript
ctx.assert(0, 'Not a three-digit integer.').len(3, 3).isInt();
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md)

## Contributors

All this is based on [express-validator](https://github.com/ctavan/express-validator)

## License

Copyright (c) 2016 Luis Carlos Cruz Carballo <lcruzc@linkux-it.com>, MIT License
