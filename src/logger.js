'use strict';
const config = require('./config');
const bunyan = require('bunyan');
const SumoLogger = require('bunyan-sumologic');
const childLoggers = [];

function getLogger(callingModule) {
  let logLevel = config.get('LOG_LEVEL') || 'info';
  let callingFileName;

  if (callingModule) {
    callingFileName = callingModule.filename.split('/').pop();
  }

  let loggerSettings = { 
    name: callingFileName || 'general',
    streams: [
      {
        level: logLevel,
        stream: process.stdout
      }    
    ]
  };

  if (config.get('SUMOLOGIC_COLLECTOR')) {
    let sumoLogicConfig = {
      collector: config.get('SUMOLOGIC_COLLECTOR'),
      endpoint: 'https://endpoint1.collection.eu.sumologic.com/receiver/v1/http/'
    };    
    let sumologicStream = {
      level: logLevel,
      stream: new SumoLogger(sumoLogicConfig),
      type: 'raw'
    };
    loggerSettings.streams.push(sumologicStream);
  }

  const logger = bunyan.createLogger(loggerSettings);
  childLoggers.push(logger); 
  return logger;
}

config.onKeyChange('LOG_LEVEL', change => {
  childLoggers.forEach(logger => logger.level(change.newValue));
});

module.exports = {
  getLogger
};
