var chai = require('chai');
var expect = chai.expect;
var request;


async function validation(ctx, next) {
  ctx.sanitize(['user', 'fields', 'email']).trim();
  ctx.body = ctx.request.body;
}

function pass(body) {
  expect(body).to.have.deep.property('user.fields.email', 'test@example.com');
}

function postRoute(path, data, test, done) {
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

describe('#nestedInputSanitizers', function() {
  describe('POST tests', function() {

    it('should return property and sanitized value', function(done) {
      postRoute('/', { user: { fields: { email: '     test@example.com       ' } } }, pass, done);
    });

  });
});
