'use strict';
const _ = require('lodash');
const __ = require('hamjest');
const sinon = require('sinon');

const mockRequire = require('mock-require');

describe('middleware - error-handler', function () {
  let newRelicMock, appMock, loggerMock, middleware;

  before(function() {
    newRelicMock = {
      noticeError: sinon.spy()
    };
    appMock = {
      emit: sinon.spy()
    };
    loggerMock = {
      error: sinon.spy()
    };
    mockRequire('../../src/utils/newrelic', { init: () => newRelicMock });
    mockRequire('../../src/logger', { getLogger: () => loggerMock });
    middleware = mockRequire.reRequire('../../src/koa-middleware/error-handler')();
  });

  after(() => mockRequire.stopAll());

  function * handleErrors(next) {
    const context = { app: appMock };
    yield middleware.bind(context)(next);
    return context;
  }

  it('should continue flow if no error is thrown', function * () {
    const next = sinon.spy(cb => cb());
    const context = yield handleErrors(next);
    __.assertThat(next.called, __.is(true));
    __.assertThat(context.body, __.is(__.undefined()));
    __.assertThat(context.status, __.is(__.undefined()));
  });

  it('should stop flow if error is thrown', function * () {
    const error = { status: 980, message: 'bad request', stack: 'my stack' };
    const next = sinon.stub().throws(error);
    const context = yield handleErrors(next);
    __.assertThat(context.body, __.is(error.message));
    __.assertThat(context.status, __.is(error.status));
    __.assertThat(appMock.emit.calledWith('error', error, context), __.is(true));
    __.assertThat(newRelicMock.noticeError.calledWith(error), __.is(true));
    __.assertThat(loggerMock.error.calledWith(error.stack, 'Server Error'), __.is(true));
  });

  it('should stop flow if no stack and status code', function * () {
    const error = { message: 'general error' };
    const next = sinon.stub().throws(error);
    const context = yield handleErrors(next);
    __.assertThat(context.body, __.is(error.message));
    __.assertThat(context.status, __.is(500));
    __.assertThat(appMock.emit.calledWith('error', error, context), __.is(true));
    __.assertThat(newRelicMock.noticeError.calledWith(error), __.is(true));
    __.assertThat(loggerMock.error.calledWith(error, 'Server Error'), __.is(true));
  });

});
