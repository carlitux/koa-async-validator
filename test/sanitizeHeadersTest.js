var chai = require('chai');
var expect = chai.expect;
var request;

async function validation(ctx, next) {
  ctx.sanitizeHeaders('x-custom-header').trim();
  ctx.body = ctx.headers;
}


function pass(body) {
  expect(body).to.have.property('x-custom-header', 'space');
}
function fail(body) {
  expect(body).to.have.property('x-custom-header').and.to.not.equal('space');
}

function getRoute(path, data, test, done) {
  request
    .get(path)
    .set('x-custom-header', data)
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

describe('#sanitizeHeaders', function() {
  describe('GET tests', function() {
    it('should return property and sanitized value when headers param is present', function(done) {
      getRoute('/', 'space   ', pass, done);
    });

    it('should not return property when headers param is missing', function(done) {
      getRoute('/', null, fail, done);
    });
  });
});
