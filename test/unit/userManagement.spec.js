'use strict';
const __ = require('hamjest');
const sinon = require('sinon');
const mockRequire = require('mock-require');
const src = '../../src/';

const config = require(src + 'config');

describe('user management', function() {
  let userManagement;

  before(function() {
    this.authenticationClientMock = {};
    this.decodedTokenMock = {};
    this.cacheMock = {
      getKey: sinon.stub(),
      setKey: sinon.stub(),
      setHashKey: sinon.stub()
    };
    this.auth0mock = {
      AuthenticationClient: sinon.stub().returns(this.authenticationClientMock)
    };

    mockRequire(src + 'helpers/cache', this.cacheMock);
    mockRequire('auth0', this.auth0mock);
    mockRequire('jwt-decode', () => this.decodedTokenMock);

    const configMock = sinon.stub(config, 'get');
    configMock.withArgs('AUTH0_DOMAIN').returns(true);
    configMock.withArgs('AUTH0_FRONT_CLIENT_ID').returns(true);

    userManagement = require('../../src/utils/userManagement');
  });

  after(function() {
    mockRequire.stopAll();
  });

  describe('parse auth token', function() {

    before(function() {



    });

    function * parseAndCompare(token, expected) {
      const context = {
        request: {
          headers : {
            authorization: token
          }
        }
      };

      const next = cb => cb();
      yield userManagement.parseAuthToken.bind(context)(next);
      __.assertThat(context.request.headers['x-user-profile'],
        __.equalTo(JSON.stringify(expected))
      );
    }

    it('should return token value from cache', function* () {
      const cachedValue = { name: 'Donald J. Trump' };
      this.cacheMock.getKey.resolves(JSON.stringify(cachedValue));
      yield parseAndCompare('Bearer 123', cachedValue);
    });

    it('should return value from auth0 if not in cache', function * () {
      const auth0Value = { name: 'Barack Obama' };

      this.cacheMock.getKey.resolves(false);
      this.authenticationClientMock.tokens = {
        getInfo: (token, callback) => callback(null, auth0Value)
      };

      yield parseAndCompare('Bearer 123', auth0Value);
    });

    it('should set cache key with response from auth0', function * () {
      const auth0Value = { name: 'John F. Kennedy' };
      const token = '123';
      this.cacheMock.setKey.reset();
      this.cacheMock.getKey.resolves(false);
      this.authenticationClientMock.tokens = {
        getInfo: (token, callback) => callback(null, auth0Value)
      };

      yield parseAndCompare('Bearer ' + token, auth0Value);

      __.assertThat(this.cacheMock.setKey.args[0],
        __.hasItems(token, JSON.stringify(auth0Value))
      );
    });

    it('should clear user-profile header', function* () {
      const context = {
        request: {
          headers : {
            'x-user-profile': 'should be cleared'
          }
        }
      };

      const next = cb => cb();
      yield userManagement.parseAuthToken.bind(context)(next);
      __.assertThat(context.request.headers['x-user-profile'], __.is(__.undefined()));
    });
  });

});

