'use strict';
const co = require('co');
const throng = require('throng');
const gracefulShutdown = require('http-graceful-shutdown');

const logger = require('../logger').getLogger(module);
const isDevelopment = process.env.NODE_ENV === 'development';

function start(startServerFunc, id) {
  logger.info({ id }, 'Starting process');

  co(startServerFunc)
  .catch(err => logger.error(err, 'failed to launch application'))
  .then(server => gracefulShutdown(server, {
    development: isDevelopment,
    signals: 'SIGINT SIGTERM uncaughtException unhandledRejection'
  }));
}

function startCluster(startServerFunc) {
  if (isDevelopment) { // don't run cluster in dev - for debugging
    start(startServerFunc, 0);
  } else {
    throng(id => start(startServerFunc, id));
  }
}

module.exports = {
  startCluster
};

