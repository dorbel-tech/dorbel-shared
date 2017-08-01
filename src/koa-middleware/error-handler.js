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
      setResponseBody.bind(this)(err);

      this.app.emit('error', err, this);
      if (newrelic) {  newrelic.noticeError(err); }

      const requestId = this.request.headers['x-request-id'];

      logger.error({
        err: err,
        ip: getRequestIp(this.request),
        referrer: this.headers.referer,
        method: this.method,
        path: this.url,
        statusCode: this.status,
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

<<<<<<< HEAD
function getRequestIp(request) {
  return request.headers['x-forwarded-for'] || request.ip;
=======
function isSequelizeError(err) {
  return err.name && err.name.startsWith('Sequelize');
>>>>>>> a7eb494abf19ecca07fa4aa5469375237295c9e8
}

module.exports = getMiddleWare;
