var chai = require('chai');
var expect = chai.expect;
var request;

async function validation(ctx, next) {
  ctx.assert(['user', 'fields', 'email'], 'not empty').notEmpty();
  ctx.assert('user.fields.email', 'not empty').notEmpty();
  ctx.assert(['user', 'fields', 'email'], 'valid email required').isEmail();
  ctx.assert(['admins', '0', 'name'], 'must only contain letters').isAlpha();

  var errors = await ctx.validationErrors();
  if (errors) {
    ctx.body = errors;
  } else {
    ctx.body = ctx.request.body;
  }
}

function fail(body) {
  expect(body[0]).to.have.property('msg', 'not empty');
  expect(body[1]).to.have.property('msg', 'not empty');
  expect(body[2]).to.have.property('msg', 'valid email required');

  // Should convert ['user', 'fields', 'email'] to 'user.fields.email'
  // when formatting the error output
  expect(body[0]).to.have.property('param').and.to.be.a('string');
  expect(body[1]).to.have.property('param').and.to.be.a('string');
  expect(body[2]).to.have.property('param').and.to.be.a('string');
}

function pass(body) {
  expect(body).to.have.deep.property('user.fields.email', 'test@example.com');
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

describe('nested input as array or dot notation', function() {
  it('should return a success when the correct data is passed on the body', function(done) {
    testRoute('/', { user: { fields: { email: 'test@example.com' } }, admins: [{ name: 'Bobby' }] }, pass, done);
  });

  it('should return an error object with each failing param as a property data is invalid', function(done) {
    testRoute('/', { user: { fields: { email: '' } }, admins: [{ name: 0 }] }, fail, done);
  });
});
