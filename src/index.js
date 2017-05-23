'use strict';
require('dotenv').config();
require('./utils/newrelic').init();

module.exports = {
  logger: require('./logger'),
  middleware: {
    requestLogger: require('./koa-middleware/request-logger'),
    swaggerModelValidator: require('./koa-middleware/swagger-model-validator'),
    errorHandler: require('./koa-middleware/error-handler'),
    auth: require('./koa-middleware/auth/index'),
  },
  helpers: {
    headers: require('./helpers/headers')
  },
  utils: {
    waitForConnection: require('./utils/waitForConnection'),
    messageBus: require('./utils/messageBus'),
    user: require('./utils/user/index'),
    analytics: require('./utils/segment'),
    generic: require('./utils/generic'),
    serverRunner: require('./utils/serverRunner'),
    cache: require('./helpers/cache'),
    domainErrors: require('./utils/domainErrors')
  }
};
