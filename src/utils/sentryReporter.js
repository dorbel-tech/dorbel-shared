'use-strict';
const config = require('../config');
const logger = require('../logger').getLogger(module);
const Raven = require('raven');
const reportErrors = (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging');

if (reportErrors) {
  const dsn = config.get('SENTRY_DSN');

  if (dsn) {
    Raven.config(dsn).install();
  }
  else {
    logger.error('Sentry DSN is not configured - errors will not be reported!');
  }
}

function report(exception) {
  if (reportErrors) {
    Raven.captureException(exception, function (captureError, eventId) {
      logger.info(`Reported ${exception}. eventId: ${eventId}`);
    });
  }
}

module.exports = {
  report
};
