describe('config', function () {
  const mockFs = require('mock-fs');
  const _ = require('lodash');
  const __ = require('hamjest');
  var config;

  const configFolder = 'some/ConfigFolder';
  const commonConfigFile = { KEY1: 'coffee', SHARED_KEY: 'tea', ENV_KEY: 'water' };
  const perEnvConfigFile = { KEY2: 'vodka', SHARED_KEY: 'beer' };
  const envConfig = { KEY3: 'sprite', ENV_KEY: 'fanta' };

  before(() => {
    _.extend(process.env, envConfig);
    mockFs({
      [configFolder]: {
        'common.json': JSON.stringify(commonConfigFile),
        [ process.env.NODE_ENV + '.json' ]: JSON.stringify(perEnvConfigFile)
      }
    });
    config = require('../../src').config;
    config.setConfigFileFolder(configFolder);
  });

  it('should read values from config folder', () => {
    __.assertThat(config.get('KEY1'), __.equalTo(commonConfigFile.KEY1));
  });

  it('should overide common values with per-environment values', () => {
    __.assertThat(config.get('SHARED_KEY'), __.equalTo(perEnvConfigFile.SHARED_KEY));
  });

  it('should overide file values with env values', () => {
    __.assertThat(config.get('ENV_KEY'), __.equalTo(envConfig.ENV_KEY));
  });

  it('should read values from env', () => {
    __.assertThat(config.get('KEY3'), __.equalTo(envConfig.KEY3));
  });

  it('should put values into process.env', () => {
    __.assertThat(process.env.KEY2, __.equalTo(perEnvConfigFile.KEY2));
  });
});
