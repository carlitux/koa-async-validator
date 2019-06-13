const chai = require('chai');

const { expect } = chai;
let request;

const errorMessage = 'Parameter is not an integer';

// There are three ways to pass parameters to express:
// - as part of the URL
// - as GET parameter in the querystring
// - as POST parameter in the body
// These test show that req.checkParams are only interested in req.params values, all other
// parameters will be ignored.

async function validation(ctx) {
  ctx
    .checkParams('testparam', errorMessage)
    .notEmpty()
    .isInt();

  const errors = await ctx.validationErrors();

  ctx.body = errors || { testparam: ctx.params.testparam };
}

function fail(body, length) {
  expect(body).to.have.length(length);
  expect(body[0]).to.have.property('msg', errorMessage);
}

function pass(body) {
  expect(body).to.have.property('testparam', '42');
}

function getRoute(path, test, length, done) {
  request.get(path).end((err, res) => {
    test(res.body, length);
    done();
  });
}

function postRoute(path, data, test, length, done) {
  request
    .post(path)
    .send(data)
    .end((err, res) => {
      test(res.body, length);
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

describe('#checkParams()', () => {
  describe('GET tests', () => {
    it('should return one error when param does not validate as int', done => {
      getRoute('/test', fail, 1, done);
    });

    it('should return two errors when param is missing', done => {
      getRoute('/', fail, 2, done);
    });

    it('should return a success when param validates', done => {
      getRoute('/42', pass, null, done);
    });

    it('should return a success when param validates and unrelated query is present', done => {
      getRoute('/42?testparam=42', pass, null, done);
    });

    it('should return one error when param does not validate as int and unrelated query is present', done => {
      getRoute('/test?testparam=blah', fail, 1, done);
    });
  });

  describe('POST tests', () => {
    it('should return one error when param does not validate as int', done => {
      postRoute('/test', null, fail, 1, done);
    });

    it('should return two errors when param is missing', done => {
      postRoute('/', null, fail, 2, done);
    });

    it('should return a success when param validates', done => {
      postRoute('/42', null, pass, null, done);
    });

    it('should return a success when param validates and unrelated query is present', done => {
      postRoute('/42?testparam=42', null, pass, null, done);
    });

    it('should return one error when param does not validate as int and unrelated query is present', done => {
      postRoute('/test?testparam=blah', null, fail, 1, done);
    });

    // POST only

    it('should return a success when param validates and unrelated query/body is present', done => {
      postRoute(
        '/42?testparam=blah',
        { testparam: 'posttest' },
        pass,
        null,
        done,
      );
    });

    it('should return one error when param does not validate as int and unrelated query/body is present', done => {
      postRoute(
        '/test?testparam=blah',
        { testparam: 'posttest' },
        fail,
        1,
        done,
      );
    });

    it('should return two errors when param is missing and unrelated query/body is present', done => {
      postRoute('/?testparam=blah', { testparam: 'posttest' }, fail, 2, done);
    });
  });
});
