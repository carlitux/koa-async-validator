const chai = require('chai');

const { expect } = chai;
let request;

const errorMessage = 'Parameter is not an integer';

async function validation(ctx) {
  ctx
    .assert('optional_param', errorMessage)
    .optional()
    .isInt();
  ctx
    .assert('optional_falsy_param', errorMessage)
    .optional({ checkFalsy: true })
    .isInt();

  const errors = await ctx.validationErrors();
  ctx.body = errors || { result: 'OK' };
}

function fail(body) {
  expect(body).to.have.length(1);
  expect(body[0]).to.have.property('msg', errorMessage);
}

function pass(body) {
  expect(body).to.have.property('result', 'OK');
}

function testRoute(path, test, done) {
  request.get(path).end((err, res) => {
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

// TODO: Don't know if all of these are necessary, but we do need to test body and header
describe('#optional()', () => {
  it('should return a success when there is an empty route', done => {
    testRoute('/', pass, done);
  });

  it('should return a success when there are no params on a route', done => {
    testRoute('/path', pass, done);
  });

  it('should return a success when the non-optional param is present', done => {
    testRoute('/path?other_param=test', pass, done);
  });

  it('should return an error when param is provided, but empty', done => {
    testRoute('/path?optional_param', fail, done);
  });

  it('should return an error when param is provided with equals sign, but empty', done => {
    testRoute('/path?optional_param=', fail, done);
  });

  it('should return an error when param is provided, but fails validation', done => {
    testRoute('/path?optional_param=test', fail, done);
  });

  it('should return a success when param is provided and validated', done => {
    testRoute('/path?optional_param=123', pass, done);
  });

  it('should return a success when the optional falsy param is present, but false', done => {
    testRoute('/path?optional_falsy_param=', pass, done);
  });

  it('should return an error when the optional falsy param is present, but does not pass', done => {
    testRoute('/path?optional_falsy_param=hello', fail, done);
  });
});
