// Error handling middleware for koa server.
// Reports error to logger.
'use strict';
function getMiddleWare() {
  const newrelic = require('../utils/newrelic').init;
  const logger = require('../logger').getLogger(module);
  const sentryReporter = require('../utils/sentryReporter');

  return function* (next) {
    try {
      yield next;
    } catch (err) {
      this.status = err.status || 500;
      this.body = err.message;
      this.app.emit('error', err, this);
      if (newrelic) { newrelic.noticeError(err); }
      logger.error(err.stack || err, 'Server Error');
      sentryReporter.report(err);
    }
  };
}

module.exports = getMiddleWare;
