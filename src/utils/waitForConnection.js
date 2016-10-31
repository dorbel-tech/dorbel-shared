'use strict';
const net = require('net');
const logger = require('./logger').getLogger(module);

const RETRY_PERIOD_MS = 3000;
const DEFAULT_RETRIES = 6;

function waitForConnection(host, port, retries) {
  if (retries === undefined) {
    retries = DEFAULT_RETRIES;
  }

  return new Promise((resolve, reject) => {
    if (retries === 0) {
      logger.error({ host, port }, 'connection was not available');
      return reject();
    }

    net.connect(port, host, () => {
      logger.info({ host, port }, 'Connection available');
      resolve(true);
    }).on('error', () => {
      logger.error({ retries, host, port }, 'Failed to connect, will retry');
      setTimeout(() => resolve(waitForConnection(host, port, --retries)), RETRY_PERIOD_MS);
    });

  });
}

module.exports = waitForConnection;
