var chai = require('chai');
var expect = chai.expect;
var request;

var errorMessage = 'Parameter is not an integer';

// There are three ways to pass parameters to express:
// - as part of the URL
// - as GET parameter in the querystring
// - as POST parameter in the body
// These test show that req.checkParams are only interested in req.params values, all other
// parameters will be ignored.

async function validation(ctx, next) {
  ctx.checkParams({
    testparam: {
      notEmpty: true,
      isInt: {
        errorMessage: 'Parameter is not an integer',
      },
    },
  });

  let errors = await ctx.validationErrors();

  ctx.body = errors ? errors : { testparam: ctx.params.testparam };
}

function fail(body, length) {
  expect(body).to.have.length(length);
  expect(body[0]).to.have.property('msg', errorMessage);
}

function failMulti(body, length) {
  expect(body).to.have.length(length);
  expect(body[0]).to.have.property('msg', 'Invalid param');
  expect(body[1]).to.have.property('msg', errorMessage);
}

function pass(body) {
  expect(body).to.have.property('testparam', '42');
}

function getRoute(path, test, length, done) {
  request.get(path).end(function(err, res) {
    test(res.body, length);
    done();
  });
}

function postRoute(path, data, test, length, done) {
  request
    .post(path)
    .send(data)
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

describe('#checkParamsSchema()', function() {
  describe('GET tests', function() {
    it('should return one error when param does not validate as int', function(done) {
      getRoute('/test', fail, 1, done);
    });

    it('should return two errors when param is missing', function(done) {
      getRoute('/', failMulti, 2, done);
    });

    it('should return a success when param validates', function(done) {
      getRoute('/42', pass, null, done);
    });

    it('should return a success when param validates and unrelated query is present', function(done) {
      getRoute('/42?testparam=42', pass, null, done);
    });

    it('should return one error when param does not validate as int and unrelated query is present', function(done) {
      getRoute('/test?testparam=blah', fail, 1, done);
    });
  });

  describe('POST tests', function() {
    it('should return one error when param does not validate as int', function(done) {
      postRoute('/test', null, fail, 1, done);
    });

    it('should return two errors when param is missing', function(done) {
      postRoute('/', null, failMulti, 2, done);
    });

    it('should return a success when param validates', function(done) {
      postRoute('/42', null, pass, null, done);
    });

    it('should return a success when param validates and unrelated query is present', function(done) {
      postRoute('/42?testparam=42', null, pass, null, done);
    });

    it('should return one error when param does not validate as int and unrelated query is present', function(done) {
      postRoute('/test?testparam=blah', null, fail, 1, done);
    });

    // POST only

    it('should return a success when param validates and unrelated query/body is present', function(done) {
      postRoute(
        '/42?testparam=blah',
        { testparam: 'posttest' },
        pass,
        null,
        done,
      );
    });

    it('should return one error when param does not validate as int and unrelated query/body is present', function(done) {
      postRoute(
        '/test?testparam=blah',
        { testparam: 'posttest' },
        fail,
        1,
        done,
      );
    });

    it('should return two errors when param is missing and unrelated query/body is present', function(done) {
      postRoute(
        '/?testparam=blah',
        { testparam: 'posttest' },
        failMulti,
        2,
        done,
      );
    });
  });
});
