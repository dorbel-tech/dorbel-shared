'use strict';
const nconf = require('nconf');
const path = require('path');
const EventEmitter = require('events');

const changesEmitter = new EventEmitter();
let config = loadConfig();

function loadConfig() {
  return nconf
  .argv() // command line args are top priority
  .env(); // environment vars are 2nd priority
}

function setConfigFileFolder(folder) {
  const commonConfigFile = path.join(folder, 'common.json');
  const environmentConfigFile = path.join(folder, process.env.NODE_ENV + '.json');
  config = loadConfig()
    .file('env-file', environmentConfigFile) // environment file is always of higher priority.
    .file('common-file', commonConfigFile);

  putValuesIntoProcessEnv(config.get());
}

function putValuesIntoProcessEnv(config) {
  for (let key in config) {
    if (typeof config[key] === 'string' && !process.env[key] && process.env[key] !== config[key]) {
      // the values in process.env are used to track if config was actually changed 
      changesEmitter.emit(key, { newValue: config[key], oldValue: process.env[key]});
      process.env[key] = config[key];
    }
  }
}

function get(key) {
  return config.get(key);
}

function onKeyChange(key, cb) {
  changesEmitter.addListener(key, cb);
}

module.exports = {
  setConfigFileFolder,
  get: get,
  onKeyChange: onKeyChange
};
