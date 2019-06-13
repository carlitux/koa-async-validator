const chai = require('chai');

const { expect } = chai;
let request;

async function validation(ctx) {
  ctx.assert(['user', 'fields', 'email'], 'not empty').notEmpty();
  ctx.assert('user.fields.email', 'not empty').notEmpty();
  ctx.assert(['user', 'fields', 'email'], 'valid email required').isEmail();
  ctx.assert(['admins', '0', 'name'], 'must only contain letters').isAlpha();

  const errors = await ctx.validationErrors();
  if (errors) {
    ctx.body = errors;
  } else {
    ctx.body = ctx.request.body;
  }
}

function fail(body) {
  expect(body[0]).to.have.property('msg', 'not empty');
  expect(body[1]).to.have.property('msg', 'not empty');
  expect(body[2]).to.have.property('msg', 'valid email required');

  // Should convert ['user', 'fields', 'email'] to 'user.fields.email'
  // when formatting the error output
  expect(body[0])
    .to.have.property('param')
    .and.to.be.a('string');
  expect(body[1])
    .to.have.property('param')
    .and.to.be.a('string');
  expect(body[2])
    .to.have.property('param')
    .and.to.be.a('string');
}

function pass(body) {
  expect(body).to.have.nested.property('user.fields.email', 'test@example.com');
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
  delete require.cache[require.resolve('./helpers/app')]; // eslint-disable-line
  const app = require('./helpers/app')(validation); // eslint-disable-line
  request = require('supertest-koa-agent')(app); // eslint-disable-line
});

describe('nested input as array or dot notation', () => {
  it('should return a success when the correct data is passed on the body', done => {
    testRoute(
      '/',
      {
        user: { fields: { email: 'test@example.com' } },
        admins: [{ name: 'Bobby' }],
      },
      pass,
      done,
    );
  });

  it('should return an error object with each failing param as a property data is invalid', done => {
    testRoute(
      '/',
      { user: { fields: { email: '' } }, admins: [{ name: 0 }] },
      fail,
      done,
    );
  });
});
