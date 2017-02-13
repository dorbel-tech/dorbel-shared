'use strict';

const co = require('co');
const throng = require('throng');
const gracefulShutdown = require('./gracefulShutdown');
const Logger = require('../logger');
const logger = Logger.getLogger(module);
const runCluster = (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging');

function start(startServerFunc, id) {
  logger.info({ id }, 'Starting process');

  // NewRelic monitoring init.
  if (process.env.NEW_RELIC_ENABLED) {
    process.env.NEW_RELIC_NO_CONFIG_FILE = 'True';
    require('newrelic');
  }

  // RisingStack Trace monitoring init.
  if (process.env.TRACE_ENABLED) {
    require('@risingstack/trace');
  }

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
  if (runCluster) {
    throng(id => start(startServerFunc, id));
  } else {
    // don't run cluster in dev/test/ci - for debugging
    start(startServerFunc, 1);
  }
}

module.exports = {
  startCluster
};

