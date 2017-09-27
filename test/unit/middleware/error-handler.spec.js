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
    mockRequire('../../../src/utils/newrelic', { init: () => newRelicMock });
    mockRequire('../../../src/logger', { getLogger: () => loggerMock });
    middleware = mockRequire.reRequire('../../../src/koa-middleware/error-handler')();
  });

  afterEach(() => loggerMock.error.reset());

  after(() => mockRequire.stopAll());

  async function handleErrors(next) {
    const context = {
      app: appMock,
      request: {
        headers: {
          'x-request-id': '123',
          'x-forwarded-for': '127.0.0.1',
          referer: 'http://localhost'
        }
      }
    };
    await middleware(context, next);
    return context;
  }

  it('should continue flow if no error is thrown', async function () {
    const next = sinon.spy();
    const context = await handleErrors(next);
    __.assertThat(next.called, __.is(true));
    __.assertThat(context.body, __.is(__.undefined()));
    __.assertThat(context.status, __.is(__.undefined()));
  });

  it('should stop flow if error is thrown', async function () {
    const error = { status: 980, message: 'bad request', referer: 'http://localhost' };
    const next = sinon.stub().throws(error);
    const context = await handleErrors(next);
    __.assertThat(context.body, __.is(error.message));
    __.assertThat(context.status, __.is(error.status));
    __.assertThat(appMock.emit.calledWith('error', error, context), __.is(true));
    __.assertThat(newRelicMock.noticeError.calledWith(error), __.is(true));
    __.assertThat(loggerMock.error.args[0], __.contains(
      __.hasProperties({ err: error }),
      __.is(error.message)
    ));
  });

  it('should stop flow if no stack and status code', async function () {
    const error = { message: 'general error' };
    const next = sinon.stub().throws(error);
    const context = await handleErrors(next);
    __.assertThat(context.body, __.is(error.message));
    __.assertThat(context.status, __.is(500));
    __.assertThat(appMock.emit.calledWith('error', error, context), __.is(true));
    __.assertThat(newRelicMock.noticeError.calledWith(error), __.is(true));
    __.assertThat(loggerMock.error.args[0], __.contains(
      __.hasProperties({ err: error }),
      __.is(error.message)
    ));
  });

  it('should log request id', async function () {
    const error = { message: 'general error' };
    const next = sinon.stub().throws(error);
    const requestId = '123-456-789';
    const context = {
      app: appMock,
      request: {
        headers: {
          'x-request-id': requestId,
          'x-forwarded-for': '127.0.0.1',
          referer: 'http://localhost'
        }
      }
    };

    await middleware(context, next);
    __.assertThat(loggerMock.error.args[0][0], __.hasProperties({ err: error, requestId }));
  });

  it('should return 400 error and return the errors in the response body for SequelizeValidationErrors', async function () {
    const error = { message: 'general error', name: 'SequelizeValidationError', errors: ['mockField is required'] };
    const next = sinon.stub().throws(error);
    const context = await handleErrors(next);
    __.assertThat(context.body, __.is(error.errors));
    __.assertThat(context.status, __.is(400));
    __.assertThat(appMock.emit.calledWith('error', error, context), __.is(true));
    __.assertThat(newRelicMock.noticeError.calledWith(error), __.is(true));
    __.assertThat(loggerMock.error.args[0], __.contains(
      __.hasProperties({ err: error }),
      __.is(error.message)
    ));
  });

  it('should return 500 error status and \'Internal error\' in the response body for general Sequelize errors', async function () {
    const error = { message: 'general error', name: 'SequelizeSomethingSomething', errors: ['mockField is required'] };
    const next = sinon.stub().throws(error);
    const context = await handleErrors(next);
    __.assertThat(context.body, __.is('Internal error'));
    __.assertThat(context.status, __.is(500));
    __.assertThat(appMock.emit.calledWith('error', error, context), __.is(true));
    __.assertThat(newRelicMock.noticeError.calledWith(error), __.is(true));
    __.assertThat(loggerMock.error.args[0], __.contains(
      __.hasProperties({ err: error }),
      __.is(error.message)
    ));
  });
});
