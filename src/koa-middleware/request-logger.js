// All request logging middleware for koa server.
// Reports all logs to logger.
'use strict';
function getMiddleWare() {
  const logger = require('../logger').getLogger(module);

  return function* (next) {
    var start = new Date;
    yield next;
    var ms = new Date - start;
    logger.info({ method: this.method, path: this.url, statusCode: this.status, duration: ms }, 'Response');
  };
}

module.exports = getMiddleWare;
