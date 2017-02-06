describe('logger', function () {
  const __ = require('hamjest');
  const bunyan = require('bunyan');
  const mockFs = require('mock-fs');
  const Logger = require('../../src/logger');
  const config = require('../../src/config');
  const testLogger = Logger.getLogger(module);
  const mockRequire = require('mock-require');
  const sinon = require('sinon');

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
      const endSpy = sinon.spy(cb => cb());
      const configMock = sinon.stub(config, 'get').withArgs('SUMOLOGIC_COLLECTOR').returns(true);
      mockRequire('bunyan-sumologic', function () {
        return { end: endSpy };
      });

      const logger = mockRequire.reRequire('../../src/logger');
      yield logger.close();

      __.assertThat(endSpy.called, __.is(true));
      configMock.reset();
      mockRequire.stopAll();
      delete process.env.SUMOLOGIC_COLLECTOR;
    });
  });
});
