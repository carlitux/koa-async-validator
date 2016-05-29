var chai = require('chai');
var expect = chai.expect;
var request;

var errorMessage = 'valid email required';

async function validation(ctx, next) {
  ctx.assert('email', 'required').notEmpty();
  ctx.assert('email', errorMessage).isEmail();

  var errors = await ctx.validationErrors(true);

  if (errors) {
    ctx.body = errors
  } else {
    ctx.body = { email: ctx.params.email || ctx.query.email || ctx.request.body.email }
  }
}

function fail(body) {
  expect(body).to.have.deep.property('email.msg', errorMessage);
}

function pass(body) {
  expect(body).to.have.property('email', 'test@example.com');
}

function testRoute(path, data, test, done) {
  request
    .post(path)
    .send(data)
    .end(function(err, res) {
      test(res.body);
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

describe('#validationErrors(true)', function() {
  it('should return a success when the correct data is passed on the body', function(done) {
    testRoute('/', { email: 'test@example.com' }, pass, done);
  });

  it('should return a mapped error object with each failing param as a property data is invalid', function(done) {
    testRoute('/path', { email: 'incorrect' }, fail, done);
  });
});
