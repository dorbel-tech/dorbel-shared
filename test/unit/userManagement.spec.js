'use strict';
const __ = require('hamjest');
const sinon = require('sinon');
const mockRequire = require('mock-require');

describe('user management', function () {
  let userManagement;

  before(function () {
    this.managmentClientMock = {
      getUsers: sinon.stub()
    };
    this.cacheMock = {
      getKey: sinon.stub(),
      setKey: sinon.stub(),
      setHashKey: sinon.stub()
    };
    this.auth0mock = {
      AuthenticationClient: sinon.stub().returns(this.authenticationClientMock),
      ManagementClient: sinon.stub().returns(this.managmentClientMock)
    };

    mockRequire('../../src/helpers/cache', this.cacheMock);
    mockRequire('auth0', this.auth0mock);

    process.env.AUTH0_DOMAIN = 'test';
    process.env.AUTH0_FRONT_CLIENT_ID = 'test';
    process.env.AUTH0_API_CLIENT_ID = 'test';
    process.env.AUTH0_API_CLIENT_SECRET = 'test';

    userManagement = require('../../src/utils/user/management');
  });

  after(function () {
    mockRequire.stopAll();
    delete process.env.AUTH0_DOMAIN;
    delete process.env.AUTH0_FRONT_CLIENT_ID;
  });

  describe('get user by email', function () {
    it('should send correct query to auth0 api', function * () {
      const email = 'a@a.com';
      this.cacheMock.getKey.resolves('cached api key');
      yield userManagement.getPublicProfileByEmail(email);
      __.assertThat(this.managmentClientMock.getUsers.args[0][0], __.hasProperty('q', 'email:"a@a.com"'));
    });

    it('should return first user in response', function * () {
      this.managmentClientMock.getUsers.resolves([ 'userOne', 'userTwo' ]);
      const user = yield userManagement.getPublicProfileByEmail('b@b.com');
      __.assertThat(user, __.equalTo('userOne'));
    });

    it('should not return anything if no response', function * () {
      this.managmentClientMock.getUsers.resolves();
      const user = yield userManagement.getPublicProfileByEmail('c@c.om');
      __.assertThat(user, __.is(__.undefined()));
    });
  });
});
