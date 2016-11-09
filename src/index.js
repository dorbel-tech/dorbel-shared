// NewRelic init 
if (process.env.NEW_RELIC_ENABLED) { 
  process.env.NEW_RELIC_NO_CONFIG_FILE = 'True';
  require('newrelic'); 
}

module.exports = {
  config: require('./config'),
  logger: require('./logger'),
  middleware: {
    requestLogger: require('./koa-middleware/request-logger'),
    swaggerModelValidator: require('./koa-middleware/swagger-model-validator'),
    errorHandler: require('./koa-middleware/error-handler'),
  },
  utils: {
    waitForConnection: require('./utils/waitForConnection'),
    notification: require('./utils/notification'),
  }
};
