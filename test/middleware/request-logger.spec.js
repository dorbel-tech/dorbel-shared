'use strict';
const sinon = require('sinon');
const __ = require('hamjest');
const mockRequire = require('mock-require');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requestLogger = require('../../src/koa-middleware/request-logger');

describe('middleware - request logger', function () {
  before(function () {
    this.sinon = sinon.sandbox.create();
    this.loggerMock = {
      trace: this.sinon.spy(),
      info: this.sinon.spy()
    };
    mockRequire('../../src/logger', { getLogger: () => this.loggerMock });
  });

  afterEach(function() {
    this.sinon.reset();
  });

  after(function() {
    mockRequire.stopAll();
  });

  function * logRequest(context) {
    const middleware = requestLogger();
    yield middleware.bind(context)(cb => cb());
  }

  it('should log normal request and response', function * () {
    const method = 'test';
    const path = '/1/2/3';
    const statusCode = 123;
    const ip = '192.0.0.1';
    const referrer = 'http://localhost';
    const context = {
      ip,
      referrer,
      method,
      url: path,
      status: statusCode,
      request: { headers: {} }
    };

    yield logRequest(context);

    __.assertThat(this.loggerMock.trace.args[0], __.contains(
      __.hasProperties({ method, path }),
      'Request'
    ));
    __.assertThat(this.loggerMock.info.args[0], __.contains(
      __.hasProperties({ ip, referrer, method, path, statusCode }),
      'Response'
    ));
  });

  it('should add request ID to logs', function * () {
    yield logRequest({ url: '123', request: { headers: {} }});
    const tracedRequestId = this.loggerMock.trace.args[0][0].requestId;
    __.assertThat(tracedRequestId, __.is(__.matchesPattern(uuidRegex)));
    __.assertThat(this.loggerMock.info.args[0][0].requestId, __.is(tracedRequestId));
  });

  it('should log existing request ID when it is supplied', function * () {
    const requestId = 'abcdef-gfgaf23-1rw';
    yield logRequest({ url: '123', request: { headers: { 'x-request-id': requestId } }});
    __.assertThat(this.loggerMock.trace.args[0][0].requestId, __.is(requestId));
    __.assertThat(this.loggerMock.info.args[0][0].requestId, __.is(requestId));
  });

  it('should not log health calls', function * () {
    yield logRequest({ url: '/health', request: { headers: {} }});
    __.assertThat(this.loggerMock.trace.called, __.is(false));
    __.assertThat(this.loggerMock.info.called, __.is(false));
  });
});
