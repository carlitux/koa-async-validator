const chai = require('chai');

const { expect } = chai;
let request;

const errorMsg = 'Parameter is not an integer.';
const errorMsgOutOfRange = 'Parameter is out of range or not int.';

// There are three ways to pass parameters to express:
// - as part of the URL
// - as GET parameter in the querystring
// - as POST parameter in the body
// These test show that req.checkParams are only interested in req.params values, all other
// parameters will be ignored.

const schema = {
  testparam: {
    in: 'params',
    notEmpty: true,
    isInt: {
      errorMessage: errorMsg,
    },
  },
  testquery: {
    in: 'query',
    notEmpty: true,
    isInt: {
      options: [
        {
          min: 2,
          max: 10,
        },
      ],
      errorMessage: errorMsgOutOfRange,
    },
  },
  skipped: {
    // this validator is a fake validator which cannot raise any error, should be always skipped
    in: 'notSupportedOne',
    notEmpty: true,
    isInt: {
      options: [
        {
          min: 2,
          max: 10,
        },
      ],
      errorMessage: errorMsgOutOfRange,
    },
  },
  numInQuery: {
    notEmpty: true,
    isInt: {
      options: [
        {
          min: 0,
          max: 665,
        },
      ],
      errorMessage: errorMsgOutOfRange,
    },
  },
};

async function validationSendResponse(ctx) {
  const errors = await ctx.validationErrors();

  if (errors) {
    ctx.body = errors;
  } else {
    ctx.body = {
      testparam: ctx.params.testparam,
      testquery: ctx.query.testquery,
      skipped: ctx.query.skipped,
      numInQuery: ctx.query.numInQuery,
    };
  }
}

async function validation(ctx, next) {
  ctx.check(schema);
  await validationSendResponse(ctx, next);
}

async function validationQuery(ctx, next) {
  ctx.checkQuery(schema);
  await validationSendResponse(ctx, next);
}

async function validationParams(ctx, next) {
  ctx.checkParams(schema);
  await validationSendResponse(ctx, next);
}

async function validationBody(ctx, next) {
  ctx.checkBody(schema);
  await validationSendResponse(ctx, next);
}

function failParams(body, length) {
  expect(body).to.have.length(length);
  expect(body[0]).to.have.property('msg', errorMsg);
}

function failQuery(body, length) {
  expect(body).to.have.length(length);
  expect(body[0]).to.have.property('msg', errorMsgOutOfRange);
}

function failAll(body, length) {
  expect(body).to.have.length(length);
  expect(body[0]).to.have.property('msg', errorMsg);
  expect(body[1]).to.have.property('msg', errorMsgOutOfRange);
}

function pass(params) {
  expect(params).to.have.property('testparam', '25');
  expect(params).to.have.property('testquery', '6');
  expect(params).to.have.property('skipped', '34');
  expect(params).to.have.property('numInQuery', '0');
}

function failQueryParams(params, length) {
  expect(params).to.have.length(length);
  expect(params[0]).to.have.property('msg', 'Invalid param');
  expect(params[1]).to.have.property('msg', errorMsgOutOfRange);
}

function getRoute(path, test, length, done) {
  request.get(path).end((err, res) => {
    test(res.body, length);
    done();
  });
}

describe('Check defining validator location inside schema validators', () => {
  // This before() is required in each set of tests in
  // order to use a new validation function in each file
  before(() => {
    delete require.cache[require.resolve('./helpers/app')];
    const app = require('./helpers/app')(validation); // eslint-disable-line
    request = require('supertest-koa-agent')(app); // eslint-disable-line
  });

  it('should validate against schema with query and params locations', done => {
    getRoute('/25?testquery=6&skipped=34&numInQuery=0', pass, 1, done);
  });

  it('should fail when param is not integer', done => {
    getRoute('/ImNot?testquery=6&skipped=34&numInQuery=0', failParams, 1, done);
  });

  it('should fail when query param is out of range', done => {
    getRoute('/25?testquery=20&skipped=34&numInQuery=0', failQuery, 1, done);
  });

  it('should fail when non of params are valid', done => {
    getRoute('/ImNot?testquery=20&skipped=34&numInQuery=0', failAll, 2, done);
  });
});

describe('Check defining validator location inside schema validators by checkQuery()', () => {
  // This before() is required in each set of tests in
  // order to use a new validation function in each file
  before(() => {
    delete require.cache[require.resolve('./helpers/app')];
    const app = require('./helpers/app')(validationQuery); // eslint-disable-line
    request = require('supertest-koa-agent')(app); // eslint-disable-line
  });

  it('should validate against schema with query and params locations', done => {
    getRoute('/25?testquery=6&skipped=34&numInQuery=0', pass, 1, done);
  });

  it('should fail when query param is out of range', done => {
    getRoute('/25?testquery=6&skipped=34&numInQuery=666', failQuery, 1, done);
  });
});

describe('Check defining validator location inside schema validators by checkParams()', () => {
  // This before() is required in each set of tests in
  // order to use a new validation function in each file
  before(() => {
    delete require.cache[require.resolve('./helpers/app')];
    const app = require('./helpers/app')(validationParams); // eslint-disable-line
    request = require('supertest-koa-agent')(app); // eslint-disable-line
  });

  it('should fail when searching for query param in the path params', done => {
    getRoute(
      '/25?testquery=6&skipped=34&numInQuery=666',
      failQueryParams,
      2,
      done,
    );
  });
});

describe('Check defining validator location inside schema validators by checkBody()', () => {
  // This before() is required in each set of tests in
  // order to use a new validation function in each file
  before(() => {
    delete require.cache[require.resolve('./helpers/app')];
    const app = require('./helpers/app')(validationBody); // eslint-disable-line
    request = require('supertest-koa-agent')(app); // eslint-disable-line
  });

  it('should fail when searching for query param in the body', done => {
    getRoute(
      '/25?testquery=6&skipped=34&numInQuery=666',
      failQueryParams,
      2,
      done,
    );
  });
});
