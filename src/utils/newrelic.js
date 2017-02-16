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

function crashClose() {
  if (!_newrelic) {
    return Promise.resolve();
  } else {
    return new Promise(resolve => {
      _newrelic.addCustomParameter('crash', 'true');
      _newrelic.agent.harvest(() => {
        process.exit(-1);
        resolve();
      });
    });
  }  
}

module.exports = {
  init,
  crashClose
};
