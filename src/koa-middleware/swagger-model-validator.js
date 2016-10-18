'use strict';
var Validator = require('swagger-model-validator');
const _ = require('lodash');
var validator = new Validator();

function getMiddleware() {
  return function* validateSwaggerSchema(next) {
    const parameters = _.get(this, ['fleek', 'routeConfig', 'details', 'parameters']);
    const bodyParamDef = _.find(parameters, { name: 'body', in: 'body' });
    const body = _.get(this, ['request', 'body']);
    let error;

    if (bodyParamDef && bodyParamDef.schema) {
      if (!body) error = 'missing body';
      else error = validator.validate(this.request.body, bodyParamDef.schema);
    }

    if (error && !error.valid) {
      this.status = 400;
      this.response.body = conformToFleekError(error);
    }
    else yield next;
  };
}

function conformToFleekError(validationError) {
  return {
    error: 'Validation Failed',
    error_name: 'VALIDATION_FAILED',
    details: validationError.GetErrorMessages()
  };
}

module.exports = getMiddleware;
