const chai = require('chai');

const { expect } = chai;
let request;

const errorMessage = 'Parameter is not an integer';

// There are three ways to pass parameters to express:
// - as part of the URL
// - as GET parameter in the querystring
// - as POST parameter in the body
// These test show that req.checkBody are only interested in req.body values, all other
// parameters will be ignored.

async function validation(ctx) {
  ctx
    .checkBody('testparam', errorMessage)
    .notEmpty()
    .isInt();
  ctx.checkBody('arrayParam').isArray();

  const errors = await ctx.validationErrors();

  ctx.body = errors || { testparam: ctx.request.body.testparam };
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

describe('#checkBody()', () => {
  describe('GET tests', () => {
    it('should return three errors when param is missing', done => {
      getRoute('/', fail, 3, done);
    });

    it('should return three errors when param is present, but not in the body', done => {
      getRoute('/42', fail, 3, done);
    });
  });

  describe('POST tests', () => {
    it('should return three errors when param is missing', done => {
      postRoute('/', null, fail, 3, done);
    });

    it('should return three errors when param is present, but not in the body', done => {
      postRoute('/42', null, fail, 3, done);
    });

    // POST only

    it('should return three errors when params are not present', done => {
      postRoute('/test?testparam=gettest', null, fail, 3, done);
    });

    it('should return three errors when param is present, but not in body', done => {
      postRoute('/42?testparam=42', null, fail, 3, done);
    });

    it('should return two errors when one param is present, but does not validate', done => {
      postRoute('/42?testparam=42', { testparam: 'posttest' }, fail, 2, done);
    });

    it('should return a success when params validate on the body', done => {
      postRoute(
        '/?testparam=blah',
        { testparam: '42', arrayParam: [1, 2, 3] },
        pass,
        null,
        done,
      );
    });

    it('should return two errors when two params are present, but do not validate', done => {
      postRoute(
        '/?testparam=42',
        { testparam: 'posttest', arrayParam: 123 },
        fail,
        2,
        done,
      );
    });

    it('should return two errors when two params are present, but do not validate', done => {
      postRoute(
        '/?testparam=42',
        { testparam: 'posttest', arrayParam: {} },
        fail,
        2,
        done,
      );
    });

    it('should return two errors when two params are present, but do not validate', done => {
      postRoute('/', { testparam: 'test', arrayParam: '[]' }, fail, 2, done);
    });

    it('should return a success when params validate on the body', done => {
      postRoute('/', { testparam: '42', arrayParam: [] }, pass, null, done);
    });
  });
});
