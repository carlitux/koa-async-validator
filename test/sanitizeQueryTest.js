const chai = require('chai');

const { expect } = chai;
let request;

async function validation(ctx) {
  ctx.sanitizeQuery('testparam').whitelist(['a', 'b', 'c']);
  ctx.body = { query: ctx.query };
}

function pass(body) {
  expect(body.query).to.have.deep.property('testparam', 'abc');
}

function fail(body) {
  expect(body).to.not.have.property('query', 'testparam');
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

describe('#sanitizeQuery', () => {
  describe('GET tests', () => {
    it('should return property and sanitized value when query param is present', done => {
      getRoute('/?testparam=abcdef', pass, done);
    });
    it('should not return property when query param is missing', done => {
      getRoute('/', fail, done);
    });
  });
  describe('POST tests', () => {
    it('should return property and sanitized value when query param is present', done => {
      postRoute('/?testparam=abcdef', null, pass, done);
    });

    it('should not return property when query param is missing', done => {
      postRoute('/', null, fail, done);
    });
  });
});
