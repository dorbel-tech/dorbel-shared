'use strict';
function getMiddleWare() {
  const logger = require('../logger').getLogger(module);

  return function* (next) {
    try {
      yield next;
    } catch (err) {
      this.status = err.status || 500;
      this.body = err.message;
      this.app.emit('error', err, this);
      logger.error(err.stack || err, 'Server Error');
    }
  };
}

module.exports = getMiddleWare;
