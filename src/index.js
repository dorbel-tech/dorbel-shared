// NewRelic monitoring init.
if (process.env.NEW_RELIC_ENABLED) {
  process.env.NEW_RELIC_NO_CONFIG_FILE = 'True';
  require('newrelic');
}

// RisingStack Trace monitoring init.
if (process.env.TRACE_ENABLED) {
  require('@risingstack/trace');
}

module.exports = {
  config: require('./config'),
  logger: require('./logger'),
  middleware: {
    requestLogger: require('./koa-middleware/request-logger'),
    swaggerModelValidator: require('./koa-middleware/swagger-model-validator'),
    errorHandler: require('./koa-middleware/error-handler'),
    authenticate: require('./koa-middleware/authentication'),
    optionalAuthenticate: require('./koa-middleware/optionalAuthentication'),
  },
  utils: {
    waitForConnection: require('./utils/waitForConnection'),
    messageBus: require('./utils/messageBus'),
    userManagement: require('./utils/userManagement'),
    analytics: require('./utils/analytics'),
    generic: require('./utils/generic'),
    serverRunner: require('./utils/serverRunner')
  }
};
