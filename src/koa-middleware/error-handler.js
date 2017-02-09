// Error handling middleware for koa server.
// Reports error to logger.
'use strict';
function getMiddleWare() {
  const logger = require('../logger').getLogger(module);
  const sentryReporter = require('../utils/sentryReporter');

  return function* (next) {
    try {
      yield next;
    } catch (err) {
      this.status = err.status || 500;
      this.body = err.message;
      this.app.emit('error', err, this);
      sentryReporter.report(err);
      logger.error(err.stack || err, 'Server Error');
    }
  };
}

module.exports = getMiddleWare;
