// NewRelic init
if (!process.env.NEW_RELIC_ENABLED) { 
  process.env.NEW_RELIC_NO_CONFIG_FILE = 'True'; 
  process.env.NEW_RELIC_ENABLED = 'False'
}
require('newrelic'); 

module.exports = {
  config: require('./config'),
  logger: require('./logger'),
  middleware: {
    requestLogger: require('./koa-middleware/request-logger'),
    swaggerModelValidator: require('./koa-middleware/swagger-model-validator')
  }
};
