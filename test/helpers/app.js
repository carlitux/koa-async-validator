// Sample app
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import koaValidator from '../../src/koa_validator';

const app = new Koa();

module.exports = validation => {
  app.use(bodyParser());
  app.use(
    koaValidator({
      customValidators: {
        isArray(value) {
          return Array.isArray(value);
        },

        isAsyncTest(testparam) {
          return new Promise(resolve => {
            setTimeout(() => {
              if (testparam === '42') {
                resolve(true);
              } else {
                resolve(false);
              }
            }, 200);
          });
        },
      },

      customSanitizers: {
        toTestSanitize() {
          return '!!!!';
        },
      },
    }),
  );

  const router = new Router();
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
