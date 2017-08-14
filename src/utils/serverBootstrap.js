'use strict';
const logger = require('../logger').getLogger(module);

const middleware = {
  requestLogger: require('../koa-middleware/request-logger'),
  swaggerModelValidator: require('../koa-middleware/swagger-model-validator'),
  errorHandler: require('../koa-middleware/error-handler'),
  auth: require('../koa-middleware/auth/index'),
};

function createApp(options = {}) {
  const Koa = require('koa');
  const bodyParser = require('koa-bodyparser');
  const koaConvert = require('koa-convert'); // TODO: after shared middleware are migrated to KOA2 format this can be removed.

  const port = parseInt(process.env.PORT) || options.defaultPort;
  const app = new Koa();

  app.use(koaConvert(middleware.errorHandler()));
  app.use(koaConvert(middleware.requestLogger()));
  app.use(bodyParser());
  app.use(koaConvert(middleware.auth.optionalAuthenticate));

  if (options.swaggerDocPath && options.controllersPath) {
    const swaggerDoc = require(options.swaggerDocPath);
    const fleekCtx = require('fleek-context');
    const fleekRouter = require('fleek-router');

    app.use((ctx, next) => {
      // replacing trailing slash in url because it breaks fleek router
      ctx.url = ctx.url.replace(/(\/$)/, '');
      return next();
    });

    app.use(fleekCtx(swaggerDoc));
    app.use(koaConvert(middleware.swaggerModelValidator()));
    app.use(fleekRouter.tag('authenticated', koaConvert(middleware.auth.authenticate)));
    app.use(fleekRouter.controllers(options.controllersPath));

    app.use(async function returnSwagger(ctx, next) {
      if (ctx.method === 'GET' && ctx.url === '/swagger') {
        ctx.body = swaggerDoc;
      } else {
        await next();
      }
    });
  }

  const listen = () => new Promise((resolve, reject) => {
    let server = app.listen(port, function () {
      logger.info({ port, env: process.env.NODE_ENV }, 'listening');
      resolve(server);
    })
    .on('error', reject);
  });

  return { app, listen };
}

module.exports = {
  createApp
};

