// Swagger model validator.
'use strict';
var Validator = require('swagger-model-validator');
const _ = require('lodash');
var validator = new Validator();

const oldFleekParamsPath = [ 'fleek', 'routeConfig', 'details', 'parameters' ];
const newFleekParamsPath = [ 'fleek', 'context', 'parameters' ];
const newFleekDefPath = [ 'fleek', 'swagger', 'definitions' ];

function getMiddleware() {
  return function* validateSwaggerSchema(next) {
    const parameters = _.get(this, oldFleekParamsPath) || _.get(this, newFleekParamsPath);
    const swaggerDefinitions = _.get(this, newFleekDefPath);

    const bodyParamDef = _.find(parameters, {
      name: 'body',
      in: 'body'
    });
    const body = _.get(this, ['request', 'body']);
    let error;

    if (bodyParamDef && bodyParamDef.schema) {
      if (!body) {
        error = 'missing body';
      } else {
        error = validator.validate(this.request.body, bodyParamDef.schema, swaggerDefinitions);
      }
    }

    if (error && !error.valid) {
      this.status = 400;
      this.response.body = conformToFleekError(error);
    } else {
      yield next;
    }
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
