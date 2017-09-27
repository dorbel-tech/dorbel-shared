'use strict';
const uuidV4 = require('uuid/v4');
const REQUEST_ID_HEADER = 'x-request-id';

// All request logging middleware for koa server.
// Reports all logs to logger.
function getMiddleWare() {
  const logger = require('../logger').getLogger(module);

  return async function (ctx, next) {
    // Don't report logs for health check requests.
    if (!ctx.url || ctx.url.indexOf('/health') > -1) {
      await next();
    }

    const requestId = getOrSetRequestId(ctx.headers);
    const start = new Date;
    logger.trace({ method: ctx.method, path: ctx.url, requestId }, 'Request');

    await next();

    const ms = new Date - start;
    logger.info({ ip: getRequestIp(ctx.request), referer: ctx.headers.referer, method: ctx.method, path: ctx.url, statusCode: ctx.status, duration: ms, requestId }, 'Response');
  };
}

function getOrSetRequestId(headers) {
  // request ID might already be set on this request - if the request was proxied
  headers[REQUEST_ID_HEADER] = headers[REQUEST_ID_HEADER] || uuidV4();
  return headers[REQUEST_ID_HEADER];
}

function getRequestIp(request) {
  return request.headers['x-forwarded-for'] || request.ip;
}

module.exports = getMiddleWare;
