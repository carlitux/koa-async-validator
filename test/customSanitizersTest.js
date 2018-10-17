var chai = require('chai');
var expect = chai.expect;
var request;

async function validation(ctx, next) {
  ctx.sanitize('testparam').toTestSanitize();
  ctx.body = {
    testparam:
      ctx.params.testparam || ctx.query.testparam || ctx.request.body.testparam,
  };
}

function pass(body) {
  expect(body).to.have.property('testparam', '!!!!');
}

function fail(body) {
  expect(body).not.to.have.property('testparam');
}

function getRoute(path, test, done) {
  request.get(path).end(function(err, res) {
    test(res.body);
    done();
  });
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

describe('#customSanitizers', function() {
  describe('GET tests', function() {
    it('should return property and sanitized value when param is present', function(done) {
      getRoute('/valA', pass, done);
    });
    it('should not return property when query and param is missing', function(done) {
      getRoute('/', fail, done);
    });

    it('should return property and sanitized value when query and param is present', function(done) {
      getRoute('/42?testparam=42', pass, done);
    });
  });
  describe('POST tests', function() {
    it('should return property and sanitized value when param is present', function(done) {
      postRoute('/valA', null, pass, done);
    });

    it('should return property and sanitized value when body, param and query is present', function(done) {
      postRoute('/vaA?testparam=gettest', { testparam: '42' }, pass, done);
    });

    it('should return property and sanitized value when body is present', function(done) {
      postRoute('/', { testparam: '42' }, pass, done);
    });
  });
});
