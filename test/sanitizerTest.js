var chai = require('chai');
var expect = chai.expect;
var request;

async function validation(ctx, next) {
  ctx.sanitize('zerotest').toString();
  ctx.sanitize('emptystrtest').toBoolean();
  ctx.sanitize('falsetest').toString();
  ctx.sanitize('testparam').whitelist(['a', 'b', 'c']);
  ctx.body = { params: ctx.params, query: ctx.query, body: ctx.request.body };
}

function pass(body) {
  if (Object.keys(body.params).length) {
    expect(body.params).to.have.property('testparam', 'abc');
  }

  if (Object.keys(body.query).length) {
    expect(body.query).to.have.property('testparam', 'abc');
  }

  if (Object.keys(body.body).length) {
    expect(body.body).to.have.property('testparam', 'abc');
  }

  if (body.body.hasOwnProperty('zerotest')) {
    expect(body.body).to.have.property('zerotest', '0');
  }

  if (body.body.hasOwnProperty('emptystrtest')) {
    expect(body.body).to.have.property('emptystrtest', false);
  }

  if (body.body.hasOwnProperty('falsetest')) {
    expect(body.body).to.have.property('falsetest', 'false');
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

describe('#sanitizers', function() {
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

    it('should return properly sanitized values even if the original value is falsy, but not null/undefined', function(done) {
      postRoute(
        '/',
        {
          testparam: '     abcdef     ',
          zerotest: 0,
          emptystrtest: '',
          falsetest: false,
        },
        pass,
        done,
      );
    });
  });
});
