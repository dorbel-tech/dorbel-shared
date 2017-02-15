'use strict';
let _newrelic;

// NewRelic initialization
function init() {
  if (process.env.NEW_RELIC_ENABLED) {
    process.env.NEW_RELIC_NO_CONFIG_FILE = 'True';

    if (!_newrelic) {
      // newrelic is cached as a singleton.
      _newrelic = require('newrelic');
    }
  }  
  return _newrelic;
}

module.exports = {
  init
};
