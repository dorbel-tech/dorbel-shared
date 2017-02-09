'use-strict';
const config = require('../config');
const logger = require('../logger').getLogger(module);
const Raven = require('raven');

const isDevelop = process.env.NODE_ENV === 'development';

if (!isDevelop) {
  const dsn = config.get('SENTRY_DSN');
  if (dsn) {
    Raven.config(dsn).install();
  }
  else {
    logger.warn('Sentry DSN is not configured - errors will not be reported!');
  }
}

function report(exception) {
  if (!isDevelop) {
    Raven.captureException(exception, function (captureError, eventId) {
      logger.info(`Reported ${exception}. eventId: ${eventId}`);
    });
  }
}

module.exports = {
  report
};
