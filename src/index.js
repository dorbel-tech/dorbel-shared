module.exports = {
  config: require('./config'),
  logger: require('./logger'),
  startMonitor: () => {
    // NewRelic init 
    process.env.NEW_RELIC_NO_CONFIG_FILE = 'True'; 
    require('newrelic'); 
  },
  middleware: {
    requestLogger: require('./koa-middleware/request-logger'),
    swaggerModelValidator: require('./koa-middleware/swagger-model-validator')
  }
};
