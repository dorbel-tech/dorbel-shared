describe('logger', function () {
  const __ = require('hamjest');
  const bunyan = require('bunyan');
  const mockRequire = require('mock-require');
  const sinon = require('sinon');
  const loggerModulePath = '../../src/logger';

  const Logger = require(loggerModulePath);
  const testLogger = Logger.getLogger(module);

  after(() => {
    // clear require cache because we are playing with the logger here and it's required everywhere
    delete require.cache[require.resolve(loggerModulePath)];
    delete process.env.SUMOLOGIC_COLLECTOR;
  });

  describe('log levels', function() {
    it('should default to info level', function() {
      __.assertThat(testLogger.level(), __.equalTo(bunyan.INFO));
    });

    it('should wait for sumo logic stream when closing', function * () {
      const sandbox = sinon.sandbox.create();
      const endSpy = sandbox.spy(cb => cb());
      process.env.SUMOLOGIC_COLLECTOR = 'test';
      mockRequire('bunyan-sumologic', function () {
        return { end: endSpy };
      });

      const logger = mockRequire.reRequire(loggerModulePath);
      yield logger.close();

      __.assertThat(endSpy.called, __.is(true));
      sandbox.restore();
      mockRequire.stopAll();
    });
  });
});
