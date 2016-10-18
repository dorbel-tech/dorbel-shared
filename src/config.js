'use strict';
const nconf = require('nconf');
const path = require('path');

let config = nconf
  .argv() // command line args are top priority
  .env(); // environment vars are 2nd priority

function setConfigFileFolder(folder) {
  const commonConfigFile = path.join(folder, 'common.json');
  const environmentConfigFile = path.join(folder, process.env.NODE_ENV + '.json');
  config = config
    .file('env-file', environmentConfigFile) // environment file is always of higher priority.
    .file('common-file', commonConfigFile);
}

function get(key) {
  return config.get(key);
}

module.exports = {
  setConfigFileFolder,
  get: get
};
