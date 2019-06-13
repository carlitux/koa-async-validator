const chai = require('chai');

const { expect } = chai;
let request;

const errorMessage = 'Parameter is not an integer';

// There are three ways to pass parameters to express:
// - as part of the URL
// - as GET parameter in the querystring
// - as POST parameter in the body
// URL params take precedence over GET params which take precedence over
// POST params.

async function validation(ctx) {
  ctx
    .check('testparam', errorMessage)
    .notEmpty()
    .isInt();

  const errors = await ctx.validationErrors();

  if (errors) {
    ctx.body = errors;
  } else {
    ctx.body = {
      testparam:
        ctx.params.testparam ||
        ctx.query.testparam ||
        ctx.request.body.testparam,
    };
  }
}

function fail(body) {
  expect(body).to.have.length(1);
  expect(body[0]).to.have.property('msg', errorMessage);
}

function pass(body) {
  expect(body).to.have.property('testparam', '42');
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

describe('#check()/#assert()/#validate()', () => {
  describe('GET tests', () => {
    it('should return an error when param does not validate', done => {
      getRoute('/test', fail, done);
    });

    it('should return a success when param validates', done => {
      getRoute('/42', pass, done);
    });

    // GET only: Test URL over GET param precedence

    it('should return an error when param and query does not validate', done => {
      getRoute('/test?testparam=gettest', fail, done);
    });

    it('should return a success when param validates, but query does not', done => {
      getRoute('/42?testparam=gettest', pass, done);
    });

    it('should return an error when query does not validate', done => {
      getRoute('/?testparam=test', fail, done);
    });

    it('should return a success when query validates', done => {
      getRoute('/?testparam=42', pass, done);
    });
  });

  describe('POST tests', () => {
    it('should return an error when param does not validate', done => {
      postRoute('/test', null, fail, done);
    });

    it('should return a success when param validates', done => {
      postRoute('/42', null, pass, done);
    });

    // POST only: Test URL over GET over POST param precedence

    it('should return an error when body validates, but failing param/query is present', done => {
      postRoute('/test?testparam=gettest', { testparam: '42' }, fail, done);
    });

    it('should return a success when param validates, but non-validating body is present', done => {
      postRoute('/42?testparam=42', { testparam: 'posttest' }, pass, done);
    });

    it('should return an error when query does not validate, but body validates', done => {
      postRoute('/?testparam=test', { testparam: '42' }, fail, done);
    });

    it('should return a success when query validates, but non-validating body is present', done => {
      postRoute('/?testparam=42', { testparam: 'posttest' }, pass, done);
    });

    it('should return an error when body does not validate', done => {
      postRoute('/', { testparam: 'test' }, fail, done);
    });

    it('should return a success when body validates', done => {
      postRoute('/', { testparam: '42' }, pass, done);
    });
  });
});
