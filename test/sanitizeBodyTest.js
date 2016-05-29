var chai = require('chai');
var expect = chai.expect;
var request;

async function validation(ctx, next) {
  ctx.sanitizeBody('testparam').whitelist(['a', 'b', 'c']);
  ctx.body = { body: ctx.request.body }
}

function pass(body) {
  expect(body).to.have.deep.property('body.testparam', 'abc');
}
function fail(body) {
  expect(body).to.not.have.property('body', 'testparam');
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

describe('#sanitizeBody', function() {
  describe('POST tests', function() {
    it('should return property and sanitized value when body param is present', function(done) {
      postRoute('/', { testparam: '   abcdf    ' }, pass, done);
    });

    it('should not return property when body param is missing', function(done) {
      postRoute('/', null, fail, done);
    });

  });
});
