const chai = require('chai');

const { expect } = chai;
let request;

async function validation(ctx) {
  ctx.sanitizeBody('testparam').whitelist(['a', 'b', 'c']);
  ctx.body = { body: ctx.request.body };
}

function pass(body) {
  expect(body.body).to.have.deep.property('testparam', 'abc');
}
function fail(body) {
  expect(body).to.not.have.property('body', 'testparam');
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

describe('#sanitizeBody', () => {
  describe('POST tests', () => {
    it('should return property and sanitized value when body param is present', done => {
      postRoute('/', { testparam: '   abcdf    ' }, pass, done);
    });

    it('should not return property when body param is missing', done => {
      postRoute('/', null, fail, done);
    });
  });
});
