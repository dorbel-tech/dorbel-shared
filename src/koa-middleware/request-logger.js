// All request logging middleware for koa server.
// Reports all logs to logger.
'use strict';
function getMiddleWare() {
  const logger = require('../logger').getLogger(module);

  return function* (next) {
    let start = new Date;
    yield next;
    let ms = new Date - start;

    // Don't report logs for health check requests.
    if(this.url && this.url.indexOf('/health') !== -1) {
      logger.info({ method: this.method, path: this.url, statusCode: this.status, duration: ms }, 'Response');
    }
  };
}

module.exports = getMiddleWare;
