const chai = require('chai');

const { expect } = chai;
let request;

async function validation(ctx) {
  ctx.sanitize(['user', 'fields', 'email']).trim();
  ctx.body = ctx.request.body;
}

function pass(body) {
  expect(body).to.have.nested.property('user.fields.email', 'test@example.com');
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

describe('#nestedInputSanitizers', () => {
  describe('POST tests', () => {
    it('should return property and sanitized value', done => {
      postRoute(
        '/',
        { user: { fields: { email: '     test@example.com       ' } } },
        pass,
        done,
      );
    });
  });
});
