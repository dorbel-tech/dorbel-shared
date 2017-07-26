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
      setResponseBody(err);

      this.app.emit('error', err, this);
      if (newrelic) {  newrelic.noticeError(err); }

      const requestId = this.request.headers['x-request-id'];
      
      logger.error({
        error: err, // renamed this prop to 'error' - bunyan's serializer drops essensial data from properties named 'err' 
        method: this.method,
        path: this.url,
        statusCode: this.status,
        requestId,
      }, err.message);
    }
  };
}

function setResponseBody(err) {
  // general errors
  this.body = err.message;
  this.status = err.status || 500;

  // Sequelize errors: hide sensitive internal data
  if (err.name.startsWith('Sequelize')) {
    this.body = 'Internal error';
    this.status = 500;

    // Validation errors should be returned as 400 errors to indicate bad requests instead of internal errors
    if (err.name === 'SequelizeValidationError') {
      this.body = err.errors;
      this.status = 400;
    }
  }
}

module.exports = getMiddleWare;
