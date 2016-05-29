var chai = require('chai');
var expect = chai.expect;
var request;

var errorMessage = 'Default error message';
var mustBeTwoDigitsMessage = 'testparam must have two digits';
var mustBeIntegerMessage = 'testparam must be an integer';


async function validation(ctx, next) {
  ctx.checkParams('testparam', errorMessage)
    .notEmpty() // with default message
    .isInt().withMessage(mustBeIntegerMessage)
    .isInt() // with default message
    .isLength({ min: 2, max: 2 }).withMessage(mustBeTwoDigitsMessage);
  var errors = await ctx.validationErrors();

  ctx.body = (errors) ? errors : { testparam: ctx.params.testparam };

}


function fail(expectedMessage) {
  if (Array.isArray(expectedMessage)) {
    return function(body, length) {
      expect(body).to.have.length(length);
      expect(expectedMessage).to.have.length(length);
      for (var i = 0; i < length; ++i) {
        expect(body[i]).to.have.property('msg', expectedMessage[i]);
      }
    };
  }
  return function(body, length) {
    expect(body).to.have.length(length);
    expect(body[0]).to.have.property('msg', expectedMessage);
  };
}

function pass(body) {
  expect(body).to.have.property('testparam', '42');
}

function getRoute(path, test, length, done) {
  request
    .get(path)
    .end(function(err, res) {
      test(res.body, length);
      done();
    });
}

// This before() is required in each set of tests in
// order to use a new validation function in each file
before(function() {
  delete require.cache[require.resolve('./helpers/app')];
  let app = require('./helpers/app')(validation);
  request = require('supertest-koa-agent')(app);
});

describe('#withMessage()', function() {
    it('should return one error per validation failure, with custom message where defined', function(done) {
      getRoute('/test', fail([mustBeIntegerMessage, errorMessage, mustBeTwoDigitsMessage]), 3, done);
    });

    it('should return four errors when param is missing, with default message for the first and third errors, and custom messages for the rest, as defined', function(done) {
      getRoute('/', fail([errorMessage, mustBeIntegerMessage, errorMessage, mustBeTwoDigitsMessage]), 4, done);
    });

    it('should return a success when param validates', function(done) {
      getRoute('/42', pass, null, done);
    });

    it('should provide a custom message when an invalid value is provided, and the validation is followed by withMessage', function(done) {
      getRoute('/199', fail(mustBeTwoDigitsMessage), 1, done);
    });

    it('should update the error message only if the preceeding validation was the one to fail', async function() {
      var validator = require('../src/koa_validator')();
      var ctx = {
        request: {
          body: {
            testParam: 'abc'
          }
        }
      };

      validator(ctx, {}, function() {});

      ctx.check('testParam', 'Default Error Message')
        .isInt() // should produce 'Default Error Message'
        .isLength({ min: 2 }).withMessage('Custom Error Message');

      let errors = await ctx.validationErrors();
      expect(errors).to.deep.equal([
        { param: 'testParam', msg: 'Default Error Message', value: 'abc' }
      ]);
    });
});
