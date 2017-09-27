// Error handling middleware for koa server.
// Reports error to logger.
'use strict';

function getMiddleWare() {
  const newrelic = require('../utils/newrelic').init();
  const logger = require('../logger').getLogger(module);

  return async function (ctx, next) {
    try {
      await next();
    } catch (err) {
      setResponseBody.bind(ctx)(err);

      ctx.app.emit('error', err, ctx);
      if (newrelic) {  newrelic.noticeError(err); }

      const requestId = ctx.request.headers['x-request-id'];

      logger.error({
        err: err,
        ip: getRequestIp(ctx.request),
        referer: ctx.request.headers.referer,
        method: ctx.method,
        path: ctx.url,
        statusCode: ctx.status,
        requestId,
        sequelizeData: isSequelizeError(err) ? {
          errors: err.errors,
          fields: err.fields,
          sql: err.sql
        } : undefined
      }, err.message);
    }
  };
}

function setResponseBody(err) {
  // general errors
  this.body = err.message;
  this.status = err.status || 500;

  // Sequelize errors: hide sensitive internal data
  if (isSequelizeError(err)) {
    this.body = 'Internal error';
    this.status = 500;

    // Validation errors should be returned as 400 errors to indicate bad requests instead of internal errors
    if (err.name === 'SequelizeValidationError') {
      this.body = err.errors;
      this.status = 400;
    }
  }
}

function getRequestIp(request) {
  return request.headers['x-forwarded-for'] || request.ip;
}

function isSequelizeError(err) {
  return err.name && err.name.startsWith('Sequelize');
}

module.exports = getMiddleWare;
