const chai = require('chai');

const { expect } = chai;
let request;

const errorMessage = 'Parameter is not valid';

// There are three ways to pass parameters to express:
// - as part of the URL
// - as GET parameter in the querystring
// - as POST parameter in the body
// These test show that req.checkQuery are only interested in req.query values, all other
// parameters will be ignored.

async function validation(ctx) {
  ctx.checkQuery({
    testparam: {
      notEmpty: true,
      errorMessage,
      isInt: true,
    },
  });

  const errors = await ctx.validationErrors();

  ctx.body = errors || { testparam: ctx.query.testparam };
}

function fail(body, length) {
  expect(body).to.have.length(length);
  expect(body[0]).to.have.property('msg', errorMessage);
}

function failMulti(body, length) {
  expect(body).to.have.length(length);
  expect(body[0]).to.have.property('msg', errorMessage);
  expect(body[1]).to.have.property('msg', errorMessage);
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

describe('#checkQuerySchema()', () => {
  describe('GET tests', () => {
    it('should return two errors when query is missing, and unrelated param is present', done => {
      getRoute('/test', failMulti, 2, done);
    });

    it('should return two errors when query is missing', done => {
      getRoute('/', failMulti, 2, done);
    });

    it('should return a success when query validates and unrelated query is present', done => {
      getRoute('/42?testparam=42', pass, null, done);
    });

    it('should return one error when query does not validate as int and unrelated query is present', done => {
      getRoute('/test?testparam=blah', fail, 1, done);
    });
  });

  describe('POST tests', () => {
    it('should return two errors when query is missing, and unrelated param is present', done => {
      postRoute('/test', null, failMulti, 2, done);
    });

    it('should return two errors when query is missing', done => {
      postRoute('/', null, failMulti, 2, done);
    });

    it('should return a success when query validates and unrelated query is present', done => {
      postRoute('/42?testparam=42', null, pass, null, done);
    });

    it('should return one error when query does not validate as int and unrelated query is present', done => {
      postRoute('/test?testparam=blah', null, fail, 1, done);
    });

    // POST only

    it('should return a success when query validates and unrelated param/body is present', done => {
      postRoute(
        '/test?testparam=42',
        { testparam: 'posttest' },
        pass,
        null,
        done,
      );
    });

    it('should return one error when query does not validate as int and unrelated param/body is present', done => {
      postRoute('/test?testparam=blah', { testparam: '42' }, fail, 1, done);
    });

    it('should return two errors when query is missing and unrelated body is present', done => {
      postRoute('/', { testparam: '42' }, failMulti, 2, done);
    });
  });
});
