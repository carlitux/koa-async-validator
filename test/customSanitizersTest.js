const chai = require('chai');

const { expect } = chai;
let request;

async function validation(ctx) {
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

describe('#customSanitizers', () => {
  describe('GET tests', () => {
    it('should return property and sanitized value when param is present', done => {
      getRoute('/valA', pass, done);
    });
    it('should not return property when query and param is missing', done => {
      getRoute('/', fail, done);
    });

    it('should return property and sanitized value when query and param is present', done => {
      getRoute('/42?testparam=42', pass, done);
    });
  });
  describe('POST tests', () => {
    it('should return property and sanitized value when param is present', done => {
      postRoute('/valA', null, pass, done);
    });

    it('should return property and sanitized value when body, param and query is present', done => {
      postRoute('/vaA?testparam=gettest', { testparam: '42' }, pass, done);
    });

    it('should return property and sanitized value when body is present', done => {
      postRoute('/', { testparam: '42' }, pass, done);
    });
  });
});
