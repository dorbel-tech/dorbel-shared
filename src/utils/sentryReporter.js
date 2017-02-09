'use-strict';
const config = require('../config');
const logger = require('../logger').getLogger(module);
const Raven = require('raven');

const isDevelop = process.env.NODE_ENV === 'development';

if (!isDevelop) {
  const dsn = config.get('SENTRY_DSN') || 'https://1d5f4dd3c2204c3f99b619bf61435a8c:6fc5debcf13949f09ab8cb564dfe41d8@sentry.io/137086';
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
