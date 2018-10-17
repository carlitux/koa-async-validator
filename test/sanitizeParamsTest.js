var chai = require('chai');
var expect = chai.expect;
var request;


async function validation(ctx, next) {
  ctx.sanitizeParams('testparam').whitelist(['a', 'b', 'c']);
  ctx.body = { params: ctx.params };
}

function pass(body) {
  expect(body.params).to.have.deep.property('testparam', 'abc');
}
function fail(body) {
  expect(body).to.not.have.property('params', 'testparam');
}

function getRoute(path, test, done) {
  request
    .get(path)
    .end(function(err, res) {
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

describe('#sanitizeParams', function() {
  describe('GET tests', function() {
    it('should return property and sanitized value when param is present', function(done) {
      getRoute('/abcdef', pass, done);
    });
    it('should not return property when param is missing', function(done) {
      getRoute('/', fail, done);
    });


  });
  describe('POST tests', function() {
    it('should return property and sanitized value when param is present', function(done) {
      postRoute('/abcdef', null, pass, done);
    });

    it('should not return property when param is missing', function(done) {
      postRoute('/', null, fail, done);
    });

  });
});
