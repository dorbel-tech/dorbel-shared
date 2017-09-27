'use strict';
const _ = require('lodash');
const __ = require('hamjest');
const sinon = require('sinon');

describe('middleware - authentication', function () {
  const authMiddleware = require('../../../../src/koa-middleware/auth/authenticate');
  const next = sinon.spy();

  async function authenticate(profileHeader) {
    next.reset();
    const context = { response: {}, request: { headers: {} } };
    if (profileHeader) {
      _.set(context, ['request', 'headers', 'x-user-profile'], profileHeader);
    }
    await authMiddleware(context, next);
    return context;
  }

  function assertUnauthenticatedRequest(context) {
    __.assertThat(context.request.user, __.is(__.undefined()));
    __.assertThat(context.response.status, __.is(401));
    __.assertThat(context.response.body, __.is('User is not authorized! Please login again.'));
    __.assertThat(next.called, __.is(false));
  }

  it('should attach valid user object to request context', async function () {
    const userObject = { id: 456 };
    const context = await authenticate(JSON.stringify(userObject));
    __.assertThat(context.request, __.hasProperty('user', userObject));
    __.assertThat(next.called, __.is(true));
  });

  it('should stop request when user object missing id', async function () {
    const invalidUserObject = { no_id: 456 };
    const context = await authenticate(JSON.stringify(invalidUserObject));
    assertUnauthenticatedRequest(context);
  });

  it('should stop request when no user object in header', async function () {
    const context = await authenticate();
    assertUnauthenticatedRequest(context);
  });

  it('should stop request when user object is not parseable', async function () {
    const context = await authenticate('not valid json');
    assertUnauthenticatedRequest(context);
  });
});
