'use strict';
const bunyan = require('bunyan');
const SumoLogger = require('bunyan-sumologic');
const childLoggers = [];

let _sumoLogicStream;

function getLogger(callingModule) {
  let logLevel = process.env.LOG_LEVEL || 'info';
  let callingFileName;

  if (callingModule) {
    callingFileName = callingModule.filename.split('/').pop();
  }

  let loggerSettings = {
    application: process.env.npm_package_name || 'unknown',
    name: callingFileName || 'general',
    serializers: bunyan.stdSerializers,
    streams: [
      {
        level: logLevel,
        stream: process.stdout
      }
    ]
  };

  if (getSumoLogicStream(logLevel)) {
    loggerSettings.streams.push(getSumoLogicStream(logLevel));
  }

  const logger = bunyan.createLogger(loggerSettings);
  childLoggers.push(logger);
  return logger;
}

function getSumoLogicStream(logLevel) {
  if (_sumoLogicStream) {
    // this stream is cached as a singleton
    return _sumoLogicStream;
  }

  if (process.env.SUMOLOGIC_COLLECTOR) {
    let sumoLogicConfig = {
      collector: process.env.SUMOLOGIC_COLLECTOR,
      endpoint: 'https://endpoint1.collection.eu.sumologic.com/receiver/v1/http/'
    };

    _sumoLogicStream = {
      level: logLevel,
      stream: new SumoLogger(sumoLogicConfig),
      type: 'raw'
    };

    return _sumoLogicStream;
  }
}

function close() {
  var slStream = getSumoLogicStream();
  if (!slStream) {
    return Promise.resolve();
  } else {
    return new Promise(resolve => slStream.stream.end(resolve));
  }
}

module.exports = {
  close,
  getLogger
};
