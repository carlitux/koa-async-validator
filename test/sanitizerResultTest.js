var chai = require('chai');
var expect = chai.expect;
var request;

async function validation(ctx, next) {
  var body = ctx.sanitizeBody('testparam').whitelist(['a', 'b', 'c']);
  var query = ctx.sanitizeQuery('testparam').whitelist(['a', 'b', 'c']);
  var params = ctx.sanitizeParams('testparam').whitelist(['a', 'b', 'c']);

  ctx.body = { params: params, query: query, body: body };
}

function pass(body) {
  if (body.params) {
    expect(body).to.have.property('params', 'abc');
  }

  if (body.query) {
    expect(body).to.have.property('query', 'abc');
  }

  if (body.body) {
    expect(body).to.have.property('body', 'abc');
  }
}
function fail(body) {
  expect(body).not.to.have.deep.property('params.testparam');
  expect(body).not.to.have.deep.property('query.testparam');
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

describe('#sanitizers (check results)', function() {
  describe('GET tests', function() {
    it('should return property and sanitized value when param is present', function(done) {
      getRoute('/abcdef', pass, done);
    });
    it('should not return property when query and param is missing', function(done) {
      getRoute('/', fail, done);
    });

    it('should return both query and param and sanitized values when they are both present', function(done) {
      getRoute('/abcdef?testparam=abcdef', pass, done);
    });
  });
  describe('POST tests', function() {
    it('should return property and sanitized value when param is present', function(done) {
      postRoute('/abcdef', null, pass, done);
    });

    it('should return both query and param and sanitized values when they are both present', function(done) {
      postRoute(
        '/abcdef?testparam=abcdef',
        { testparam: '    abcdef     ' },
        pass,
        done,
      );
    });

    it('should return property and sanitized value when body is present', function(done) {
      postRoute('/', { testparam: '     abcdef     ' }, pass, done);
    });
  });
});
