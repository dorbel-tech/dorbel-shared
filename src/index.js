'use strict';
require('dotenv');
require('./utils/newrelic').init();

module.exports = {
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
    serverRunner: require('./utils/serverRunner'),
    cache: require('./helpers/cache'),
    domainErrors: require('./utils/domainErrors')
  }
};
