'use strict';
const uuidV4 = require('uuid/v4');
const REQUEST_ID_HEADER = 'x-request-id';

// All request logging middleware for koa server.
// Reports all logs to logger.
function getMiddleWare() {
  const logger = require('../logger').getLogger(module);

  return function* (next) {
    // Don't report logs for health check requests.
    if (!this.url || this.url.indexOf('/health') > -1) {
      return yield next;
    }

    const requestId = getOrSetRequestId(this.headers);
    const start = new Date;
    logger.debug({ method: this.method, path: this.url, requestId }, 'Request');

    yield next;

    const ms = new Date - start;
    logger.info({ ip: getRequestIp(this.request), referer: this.headers.referer, method: this.method, path: this.url, statusCode: this.status, duration: ms, requestId }, 'Response');
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
