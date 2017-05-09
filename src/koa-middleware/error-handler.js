// Error handling middleware for koa server.
// Reports error to logger.
'use strict';

function getMiddleWare() {
  const newrelic = require('../utils/newrelic').init();
  const logger = require('../logger').getLogger(module);

  return function* (next) {
    try {
      yield next;
    } catch (err) {
      this.status = err.status || 500;
      this.body = err.message;

      this.app.emit('error', err, this);
      if (newrelic) {  newrelic.noticeError(err); }

      const requestId = this.request.headers['x-request-id'];
      
      logger.error({
        err,
        method: this.method,
        path: this.url,
        statusCode: this.status,
        requestId,
      }, err.message);
    }
  };
}

module.exports = getMiddleWare;
