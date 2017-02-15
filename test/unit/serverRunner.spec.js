'use strict';
const http = require('http');
const sinon = require('sinon');
const request = require('request-promise');
const __ = require('hamjest');
const mockRequire = require('mock-require');

describe('server runner', function() {
  const testServerPort = 9999;
  const responseData = 'should return';
  const unhandledError = new Error('this will happen before the reponse');

  function startFaultyServer() {
    return new Promise(resolve => {
      var server = http.createServer(function (request, response) {
        setTimeout(() => {
          throw unhandledError;
        }, 200);

        setTimeout(() => {
          response.writeHead(200);
          response.end(responseData);
        }, 500);
      });

      server.listen(testServerPort, () => resolve(server));
    });
  }

  before(function () {
    this.sinon = sinon.sandbox.create();
    this.mockLogger = { info: sinon.spy(), error: sinon.spy() };
    this.loggerClose = this.sinon.stub().returns(Promise.resolve());
    mockRequire('../../src/logger', {
      getLogger: () => this.mockLogger,
      close: this.loggerClose
    });
    mockRequire('newrelic', {
      addCustomParameter: sinon.spy(),
      agent: {
        harvest: sinon.spy()
      }      
    });
    this.processExit = this.sinon.stub(process, 'exit');

    this.mochaListeners = process.listeners('uncaughtException');
    process.removeAllListeners('uncaughtException');

    this.waitForConnection = require('../../src/utils/waitForConnection');
    this.serverRunner = mockRequire.reRequire('../../src/utils/serverRunner');
  });

  after(function () {
    mockRequire.stopAll();
    this.sinon.restore();
    this.mochaListeners.forEach(listener => process.on('uncaughtException', listener));
  });

  it('should let connections finish before closing server and then exit', function * () {
    this.serverRunner.startCluster(startFaultyServer);
    yield this.waitForConnection({ port: testServerPort, host: '127.0.0.1' });

    const response = yield request(`http://127.0.0.1:${testServerPort}/`);

    __.assertThat(response, __.equalTo(responseData));
    __.assertThat(this.processExit.called, __.is(true));
    __.assertThat(this.loggerClose.called, __.is(true));
    __.assertThat(this.mockLogger.error.args[0][0], __.is(unhandledError));
  });

});
