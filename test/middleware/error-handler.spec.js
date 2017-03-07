'use strict';
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

  afterEach(() => loggerMock.error.reset());

  after(() => mockRequire.stopAll());

  function * handleErrors(next) {
    const context = {
      app: appMock,
      request: {
        headers: { 'x-request-id': '123' }
      }
    };
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
    __.assertThat(loggerMock.error.args[0], __.contains(
      __.hasProperties({ err: error }),
      __.is('Server Error')
    ));
  });

  it('should stop flow if no stack and status code', function * () {
    const error = { message: 'general error' };
    const next = sinon.stub().throws(error);
    const context = yield handleErrors(next);
    __.assertThat(context.body, __.is(error.message));
    __.assertThat(context.status, __.is(500));
    __.assertThat(appMock.emit.calledWith('error', error, context), __.is(true));
    __.assertThat(newRelicMock.noticeError.calledWith(error), __.is(true));
    __.assertThat(loggerMock.error.args[0], __.contains(
      __.hasProperties({ err: error }),
      __.is('Server Error')
    ));
  });

  it('should log request id', function * () {
    const error = { message: 'general error' };
    const next = sinon.stub().throws(error);
    const requestId = '123-456-789';
    const context = {
      app: appMock,
      request: {
        headers: {
          'x-request-id': requestId
        }
      }
    };

    yield middleware.bind(context)(next);
    __.assertThat(loggerMock.error.args[0][0], __.hasProperties({ requestId, err: error }));
  });

});
