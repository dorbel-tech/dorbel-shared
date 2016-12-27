'use strict';
const config = require('./config');
const bunyan = require('bunyan');
const Logger = require('le_node');

const LOG_LEVEL = 'LOG_LEVEL';
const childLoggers = [];

function getLogger(callingModule) {
  let callingFileName;
  if (callingModule) {
    callingFileName = callingModule.filename.split('/').pop();
  }

  let loggerSettings = { 
    name: callingFileName || 'general', 
    level: config.get(LOG_LEVEL)
  };

  if (config.get('LOGENTRIES_TOKEN')) {
    loggerSettings.token = config.get('LOGENTRIES_TOKEN');
    loggerSettings.streams = [ Logger.bunyanStream(loggerSettings) ];
  }

  const logger = bunyan.createLogger(loggerSettings);
  childLoggers.push(logger); 
  return logger;
}

config.onKeyChange(LOG_LEVEL, change => {
  childLoggers.forEach(logger => logger.level(change.newValue));
});

module.exports = {
  getLogger
};
