const chai = require('chai');

const { expect } = chai;
let request;

async function validation(ctx) {
  ctx.sanitizeHeaders('x-custom-header').trim();
  ctx.body = ctx.headers;
}

function pass(body) {
  expect(body).to.have.property('x-custom-header', 'space');
}
function fail(body) {
  expect(body)
    .to.have.property('x-custom-header')
    .and.to.not.equal('space');
}

function getRoute(path, data, test, done) {
  request
    .get(path)
    .set('x-custom-header', data)
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

describe('#sanitizeHeaders', () => {
  describe('GET tests', () => {
    it('should return property and sanitized value when headers param is present', done => {
      getRoute('/', 'space   ', pass, done);
    });

    it('should not return property when headers param is missing', done => {
      getRoute('/', null, fail, done);
    });
  });
});
