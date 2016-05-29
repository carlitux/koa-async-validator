import util from 'util';
import Koa from 'koa';
import koaValidator from 'koa-async-validator';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';

const app = new Koa();
const router = new Router();

app.use(bodyParser());
app.use(expressValidator([options])); // this line must be immediately after bodyParser()!

router.post('/:urlparam', async (ctx, next) => {

  // VALIDATION
  // checkBody only checks ctx.request.body; none of the other req parameters
  // Similarly checkParams only checks in ctx.params (URL params) and
  // checkQuery only checks ctx.query (GET params).
  ctx.checkBody('postparam', 'Invalid postparam').notEmpty().isInt();
  ctx.checkParams('urlparam', 'Invalid urlparam').isAlpha();
  ctx.checkQuery('getparam', 'Invalid getparam').isInt();

  // OR assert can be used to check on all 3 types of params.
  // ctx.assert('postparam', 'Invalid postparam').notEmpty().isInt();
  // ctx.assert('urlparam', 'Invalid urlparam').isAlpha();
  // ctx.assert('getparam', 'Invalid getparam').isInt();

  // SANITIZATION
  // as with validation these will only validate the corresponding
  // request object
  ctx.sanitizeBody('postparam').toBoolean();
  ctx.sanitizeParams('urlparam').toBoolean();
  ctx.sanitizeQuery('getparam').toBoolean();

  // OR find the relevent param in all areas
  ctx.sanitize('postparam').toBoolean();

  let errors = await ctx.validationErrors();

  if (errors) {
    ctx.body = `There have been validation errors: ${ util.inspect(errors) }`;
    ctx.status = 400;
  } else {
    ctx.body = {
      urlparam: ctx.params.urlparam,
      getparam: ctx.params.getparam,
      postparam: ctx.params.postparam
    }
  }

  await next();
});

app
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(8888);

