const chai = require('chai');

const { expect } = chai;
let request;

const errorMessage = 'valid email required';

async function validation(ctx) {
  ctx.assert('email', 'required').notEmpty();
  ctx.assert('email', errorMessage).isEmail();

  const errors = await ctx.validationErrors(true);

  if (errors) {
    ctx.body = errors;
  } else {
    ctx.body = {
      email: ctx.params.email || ctx.query.email || ctx.request.body.email,
    };
  }
}

function fail(body) {
  expect(body.email).to.have.deep.property('msg', errorMessage);
}

function pass(body) {
  expect(body).to.have.property('email', 'test@example.com');
}

function testRoute(path, data, test, done) {
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

describe('#validationErrors(true)', () => {
  it('should return a success when the correct data is passed on the body', done => {
    testRoute('/', { email: 'test@example.com' }, pass, done);
  });

  it('should return a mapped error object with each failing param as a property data is invalid', done => {
    testRoute('/path', { email: 'incorrect' }, fail, done);
  });
});
