const chai = require('chai');

const { expect } = chai;
let request;

async function validation(ctx) {
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

describe('#sanitizeParams', () => {
  describe('GET tests', () => {
    it('should return property and sanitized value when param is present', done => {
      getRoute('/abcdef', pass, done);
    });
    it('should not return property when param is missing', done => {
      getRoute('/', fail, done);
    });
  });
  describe('POST tests', () => {
    it('should return property and sanitized value when param is present', done => {
      postRoute('/abcdef', null, pass, done);
    });

    it('should not return property when param is missing', done => {
      postRoute('/', null, fail, done);
    });
  });
});
