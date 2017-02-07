describe('logger', function () {
  const __ = require('hamjest');
  const bunyan = require('bunyan');
  const mockFs = require('mock-fs');
  const mockRequire = require('mock-require');
  const sinon = require('sinon');
  const loggerModulePath = '../../src/logger';
  const config = require('../../src/config');

  const Logger = require(loggerModulePath);
  const testLogger = Logger.getLogger(module);

  after(() => {
    // clear require cache because we are playing with the logger here and it's required everywhere
    delete require.cache[require.resolve(loggerModulePath)];
  });

  describe('log levels', function() {
    it('should default to info level', function() {
      __.assertThat(testLogger.level(), __.equalTo(bunyan.INFO));
    });

    it('should change all log levels when configuration is updated', function() {
      const configFolder = 'some/ConfigFolder';
      mockFs({
        [configFolder]: {
          'common.json': JSON.stringify({ LOG_LEVEL: 'trace' })
        }
      });
      config.setConfigFileFolder(configFolder);
      __.assertThat(testLogger.level(), __.equalTo(bunyan.TRACE));
      mockFs.restore();
    });

    it('should wait for sumo logic stream when closing', function * () {
      const sandbox = sinon.sandbox.create();
      const endSpy = sandbox.spy(cb => cb());
      sandbox.stub(config, 'get').withArgs('SUMOLOGIC_COLLECTOR').returns(true);
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
