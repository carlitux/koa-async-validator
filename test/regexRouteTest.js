const chai = require('chai');

const { expect } = chai;
let request;

const errorMessage = 'Parameter is not a 3 digit integer';

async function validation(ctx) {
  ctx
    .assert(0, errorMessage)
    .len(3, 3)
    .isInt();

  const errors = await ctx.validationErrors();
  ctx.body = errors || [ctx.params[0]];
}

function fail(body) {
  expect(body).to.have.length(1);
  expect(body[0]).to.have.property('msg', errorMessage);
}

function pass(body) {
  expect(body[0]).to.equal('123');
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

describe('Koa routes can be defined using regular expressions', () => {
  it('should return a success when regex route is validated', done => {
    testRoute('/test123', pass, done);
  });

  it('should return an error when regex route is not validated', done => {
    testRoute('/test0123', fail, done);
  });
});
