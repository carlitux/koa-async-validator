// Sample app
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import koaValidator from '../../src/koa_validator';

const port = process.env.PORT || 8888;
const app = new Koa();

// If no native implementation of Promise exists (less than Node v4),
// use Bluebird promises so we can test for both depending on the Node version
if (typeof Promise === 'undefined') {
  Promise = require('bluebird');
}

module.exports = function(validation) {
  app.use(bodyParser());
  app.use(
    koaValidator({
      customValidators: {
        isArray: function(value) {
          return Array.isArray(value);
        },

        isAsyncTest: function(testparam) {
          return new Promise(function(resolve, reject) {
            setTimeout(function() {
              if (testparam === '42') {
                return resolve(true);
              }
              reject();
            }, 200);
          });
        },
      },

      customSanitizers: {
        toTestSanitize: function() {
          return '!!!!';
        },
      },
    }),
  );

  let router = new Router();
  router
    .get(/\/test(\d+)/, validation)
    .get('/:testparam?', validation)
    .post('/:testparam?', validation);

  app.use(router.routes()).use(router.allowedMethods());

  // app.use(_.get(, validation));
  // app.use(_.get(, validation));
  // app.use(_.post('/:testparam?', validation));

  return app;
};
