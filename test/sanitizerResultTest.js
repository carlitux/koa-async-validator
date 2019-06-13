const chai = require('chai');

const { expect } = chai;
let request;

async function validation(ctx) {
  const body = ctx.sanitizeBody('testparam').whitelist(['a', 'b', 'c']);
  const query = ctx.sanitizeQuery('testparam').whitelist(['a', 'b', 'c']);
  const params = ctx.sanitizeParams('testparam').whitelist(['a', 'b', 'c']);

  ctx.body = { params, query, body };
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
  request.get(path).end((err, res) => {
    test(res.body);
    done();
  });
}

function postRoute(path, data, test, done) {
  request
    .post(path)
    .send(data)
    .end((err, res) => {
      test(res.body);
      done();
    });
}

// This before() is required in each set of tests in
// order to use a new validation function in each file
before(() => {
  delete require.cache[require.resolve('./helpers/app')];
  const app = require('./helpers/app')(validation); // eslint-disable-line
  request = require('supertest-koa-agent')(app); // eslint-disable-line
});

describe('#sanitizers (check results)', () => {
  describe('GET tests', () => {
    it('should return property and sanitized value when param is present', done => {
      getRoute('/abcdef', pass, done);
    });
    it('should not return property when query and param is missing', done => {
      getRoute('/', fail, done);
    });

    it('should return both query and param and sanitized values when they are both present', done => {
      getRoute('/abcdef?testparam=abcdef', pass, done);
    });
  });
  describe('POST tests', () => {
    it('should return property and sanitized value when param is present', done => {
      postRoute('/abcdef', null, pass, done);
    });

    it('should return both query and param and sanitized values when they are both present', done => {
      postRoute(
        '/abcdef?testparam=abcdef',
        { testparam: '    abcdef     ' },
        pass,
        done,
      );
    });

    it('should return property and sanitized value when body is present', done => {
      postRoute('/', { testparam: '     abcdef     ' }, pass, done);
    });
  });
});
