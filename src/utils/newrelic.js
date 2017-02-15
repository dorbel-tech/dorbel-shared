'use strict';

// NewRelic initialization
function init() {
  let newrelic = undefined;

  if (process.env.NEW_RELIC_ENABLED) {
    process.env.NEW_RELIC_NO_CONFIG_FILE = 'True';
    newrelic = require('newrelic');
  }  

  return newrelic;
}

module.exports = {
  init
};
