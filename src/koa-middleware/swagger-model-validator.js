// Swagger model validator.
'use strict';
var Validator = require('swagger-model-validator');
const _ = require('lodash');
var validator = new Validator();

const oldFleekParamsPath = [ 'fleek', 'routeConfig', 'details', 'parameters' ];
const newFleekParamsPath = [ 'fleek', 'context', 'parameters' ];
const newFleekDefPath = [ 'fleek', 'swagger', 'definitions' ];

function getMiddleware() {
  return async function validateSwaggerSchema(ctx, next) {
    const parameters = _.get(ctx, oldFleekParamsPath) || _.get(ctx, newFleekParamsPath);
    const swaggerDefinitions = _.get(ctx, newFleekDefPath);

    const bodyParamDef = _.find(parameters, {
      name: 'body',
      in: 'body'
    });
    const body = _.get(ctx, ['request', 'body']);
    let error;

    if (bodyParamDef && bodyParamDef.schema) {
      if (!body) {
        error = 'missing body';
      } else {
        error = validator.validate(ctx.request.body, bodyParamDef.schema, swaggerDefinitions);
      }
    }

    if (error && !error.valid) {
      ctx.status = 400;
      ctx.response.body = conformToFleekError(error);
    } else {
      await next();
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
