'use strict';
describe('middleware - swagger model validator', function () {
  const _ = require('lodash');
  const __ = require('hamjest');
  const middleware = require('../../../src/koa-middleware/swagger-model-validator')();

  const schema = {
    type: 'object',
    properties: {
      apartment_id: { type: 'integer' },
      title: { type: 'string' }
    },
    required: ['title']
  };

  async function callMiddleware(body) {
    let context = { response: {}, request: {} };
    _.set(context, ['fleek', 'routeConfig', 'details', 'parameters'], [{ name: 'body', in: 'body', schema }]);
    context.request.body = body;

    const next = () => { context.validated = true; };
    await middleware(context, next);
    return context;
  }

  function assertErrorMessage(body, detailMatcher) {
    __.assertThat(body, __.hasProperties({
      error: 'Validation Failed',
      error_name: 'VALIDATION_FAILED',
      details: detailMatcher
    }));
  }

  it('should clear valid model', async function () {
    let context = await callMiddleware({ title: 'is enough' });
    __.assertThat(context.validated, __.equalTo(true));
  });

  it('should return 400 when model is not valid', async function () {
    let context = await callMiddleware({});
    __.assertThat(context.status, __.equalTo(400));
  });

  it('should return error message when value is missing', async function () {
    let context = await callMiddleware({ shoes: 'are cool' });
    let body = context.response.body;
    assertErrorMessage(body, __.hasItem('title is a required field'));
  });

  it('should return error message when wrong data type', async function () {
    let context = await callMiddleware({ title: 7 });
    let body = context.response.body;
    assertErrorMessage(body, __.hasItem(__.containsString('not a type of string')));
  });
});
