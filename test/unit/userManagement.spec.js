'use strict';
const __ = require('hamjest');
const sinon = require('sinon');
const mockRequire = require('mock-require');
const src = '../../src/';

describe('user management', function () {
  let userManagement;

  before(function () {
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
    this.currentUnixTime = 10;
    this.momentMock = {
      unix: () => this.currentUnixTime
    };

    mockRequire(src + 'helpers/cache', this.cacheMock);
    mockRequire('auth0', this.auth0mock);
    mockRequire('jwt-decode', () => this.decodedTokenMock);
    mockRequire('moment', () => this.momentMock);

    process.env.AUTH0_DOMAIN = 'test';
    process.env.AUTH0_FRONT_CLIENT_ID = 'test';

    userManagement = require('../../src/utils/userManagement');
  });

  after(function () {
    mockRequire.stopAll();
    delete process.env.AUTH0_DOMAIN;
    delete process.env.AUTH0_FRONT_CLIENT_ID;
  });

  describe('parse auth token', function () {

    function* parseAndCompare(token, expected) {
      const context = {
        request: {
          headers: {
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
      const cachedValue = { email: 'donaldJ@Trump.com' };
      this.cacheMock.getKey.resolves(JSON.stringify(cachedValue));
      yield parseAndCompare('Bearer 123', cachedValue);
    });

    it('should return value from auth0 if not in cache', function* () {
      const auth0Value = { email: 'Barack123@Obama.com' };

      this.cacheMock.getKey.resolves(false);
      this.authenticationClientMock.tokens = {
        getInfo: (token, callback) => callback(null, auth0Value)
      };

      yield parseAndCompare('Bearer 123', auth0Value);
    });

    it('should set cache with token key with response from auth0', function* () {
      const tokenExpirationTime = 15;
      const tokenTTL = tokenExpirationTime - this.currentUnixTime;
      const auth0Value = { email: 'john_f@kennedy.com' };
      const token = '123';

      this.cacheMock.setKey.reset();
      this.cacheMock.getKey.resolves(false);
      this.decodedTokenMock.exp = tokenExpirationTime;
      this.authenticationClientMock.tokens = {
        getInfo: (token, callback) => callback(null, auth0Value)
      };

      yield parseAndCompare('Bearer ' + token, auth0Value);

      __.assertThat(this.cacheMock.setKey.args[0],
        __.contains(token, JSON.stringify(auth0Value), tokenTTL)
      );
    });

    it('should set cache with hash and user id', function* () {
      const dorbel_user_id = 'Richard Nixon';
      const auth0Value = { dorbel_user_id };
      const token = '123';

      this.cacheMock.setHashKey.reset();
      this.cacheMock.getKey.resolves(false);
      this.authenticationClientMock.tokens = {
        getInfo: (token, callback) => callback(null, auth0Value)
      };

      yield parseAndCompare('Bearer ' + token, { id: dorbel_user_id });

      __.assertThat(this.cacheMock.setHashKey.args[0],
        __.contains('auth0_users_by_uuid', dorbel_user_id, JSON.stringify(auth0Value))
      );

    });

    it('should clear user-profile header', function* () {
      const context = {
        request: {
          headers: {
            'x-user-profile': 'should be cleared'
          }
        }
      };

      const next = cb => cb();
      yield userManagement.parseAuthToken.bind(context)(next);
      __.assertThat(context.request.headers['x-user-profile'], __.is(__.undefined()));
    });

    it('should not call cache or auth0 if token is already expired', function* () {
      const tokenExpirationTime = this.currentUnixTime - 5; // expired before now

      this.cacheMock.getKey.reset();
      this.decodedTokenMock.exp = tokenExpirationTime;
      this.authenticationClientMock.tokens = {
        getInfo: sinon.spy()
      };

      yield parseAndCompare('Bearer 123', undefined);
      __.assertThat(this.cacheMock.getKey.called, __.is(false));
      __.assertThat(this.authenticationClientMock.tokens.getInfo.called, __.is(false));
    });
  });
});
