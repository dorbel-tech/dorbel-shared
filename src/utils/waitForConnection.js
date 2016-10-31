'use strict';
const net = require('net');
const logger = require('../logger').getLogger(module);

const RETRY_PERIOD_MS = 3000;
const DEFAULT_RETRIES = 6;

function waitForConnection(params, retries) {
  if (retries === undefined) {
    retries = DEFAULT_RETRIES;
  }

  return new Promise((resolve, reject) => {
    if (retries === 0) {
      logger.error({ params }, 'connection was not available');
      return reject();
    }

    connect(params)
    .once('connect', () => {
      logger.info({ params }, 'Connection available');
      resolve(true);
    })
    .once('error', () => {
      logger.error({ retries, params }, 'Failed to connect, will retry');
      setTimeout(() => resolve(waitForConnection(params, --retries)), RETRY_PERIOD_MS);
    });

  });
}

function connect(params) {
  if (params.port && params.host) {
    return net.connect(params.port, params.host);
  }
  else if (params.path) {
    return net.connect(params.path);
  }
  else {
    throw new Error('No connection params specificied');
  }
}

module.exports = waitForConnection;
