'use strict';
const co = require('co');
const throng = require('throng');
const gracefulShutdown = require('http-graceful-shutdown');

const logger = require('../logger').getLogger(module);
const isDevelopment = process.env.NODE_ENV === 'development';

function start(startServerFunc, id) {
  logger.info({ id }, 'Starting process');

  // Catch all uncaught exceptions and write to log.
  // TODO: Move to dorbel-shared.
  process.on('uncaughtException', function(err) {
    logger.error(err, 'uncaughtException');
  });

  // Catch all uncaught exceptions and write to log.
  // TODO: Move to dorbel-shared.
  process.on('unhandledRejection', function(err) {
    logger.error(err, 'unhandledRejection');
  });

  co(startServerFunc)
  .then(server => gracefulShutdown(server, {
    development: isDevelopment, // graceful exit is skipped in development
    signals: 'SIGINT SIGTERM uncaughtException unhandledRejection',
    callback: () => logger.info({ id }, 'Stopped process gracefully')
  }))
  .catch(err => logger.error(err, 'Failed to launch application'));
}

function startCluster(startServerFunc) {
  if (isDevelopment) {
    // don't run cluster in dev - for debugging
    start(startServerFunc, 0);
  } else {
    throng(id => start(startServerFunc, id));
  }
}

module.exports = {
  startCluster
};

