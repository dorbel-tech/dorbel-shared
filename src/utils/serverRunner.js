'use strict';
const co = require('co');
const throng = require('throng');
const gracefulShutdown = require('./gracefulShutdown');

const Logger = require('../logger');
const logger = Logger.getLogger(module);
const isDevelopment = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');

function start(startServerFunc, id) {
  logger.info({ id }, 'Starting process');

  co(startServerFunc)
  .then(handleProcessErrors)
  .catch(err => logger.error(err, 'Failed to launch application'));
}

function handleProcessErrors(server) {
  var graceful = gracefulShutdown(server);

  function exit() {
    Promise.all([
      graceful.shutdown(),
      Logger.close()
    ])
    .catch(() => {}) // ignore errors thrown here
    .then(() => process.exit(-1));
  }

  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);
  process.on('uncaughtException', function (err) {
    logger.error(err, 'Uncaught exception in process, exiting');
    exit();
  });
}

function startCluster(startServerFunc) {
  if (isDevelopment) {
    // don't run cluster in dev - for debugging
    start(startServerFunc, 1);
  } else {
    throng(id => start(startServerFunc, id));
  }
}

module.exports = {
  startCluster
};

