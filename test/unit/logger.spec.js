describe('logger', function () {
  const __ = require('hamjest');
  const bunyan = require('bunyan');
  const mockFs = require('mock-fs');
  const shared = require('../../src');
  const testLogger = shared.logger.getLogger(module);

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
      shared.config.setConfigFileFolder(configFolder);
      __.assertThat(testLogger.level(), __.equalTo(bunyan.TRACE));
    });
  });
});
