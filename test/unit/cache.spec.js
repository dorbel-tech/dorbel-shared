'use strict';
const mockRequire = require('mock-require');
const sinon = require('sinon').sandbox.create();
const __ = require('hamjest');
const EventEmitter = require('events');

describe('Redis Cache Helper', function() {

  function init() {
    this.cachedValue = 'some value';
    this.redisClientMock = Object.assign(new EventEmitter(), {
      // we are directly testing the Async methods even though those are created by Bluebird
      getAsync: sinon.stub().resolves(this.cachedValue),
      hgetAsync: sinon.stub().resolves(this.cachedValue),
      setexAsync: sinon.spy(),
      setAsync: sinon.spy(),
      hsetAsync: sinon.spy()
    });
    this.redisModuleMock = {
      RedisClient: {
        prototype: {}
      },
      createClient: sinon.stub().returns(this.redisClientMock),
    };
    mockRequire('redis', this.redisModuleMock);
    process.env.REDIS_HOST = 'test';

    this.cache = mockRequire.reRequire('../../src/helpers/cache');
  }

  function assertCallingCreateClient(funcName) {
    it('should call create client the first time', function * () {
      var result = this.cache[funcName](1, 2, 3);
      yield (result || Promise.resolve());
      __.assertThat(this.redisModuleMock.createClient.called, __.is(true));
    });

    it('should not call create client the second time', function * () {
      var result = this.cache[funcName](4, 5, 6);
      yield (result || Promise.resolve());
      __.assertThat(this.redisModuleMock.createClient.called, __.is(false));
    });
  }

  after(() => {
    mockRequire.stopAll();
    delete process.env.REDIS_HOST;
  });

  afterEach(() => sinon.reset());

  describe('redis client', function() {
    before(init);

    it('should mark isConnected true on re-connect', function * () {
      __.assertThat(this.redisClientMock.isConnected, __.is(__.undefined()));
      // this will call createClient
      yield this.cache.getKey('some key');
      __.assertThat(this.redisClientMock.isConnected, __.is(true));
      this.redisClientMock.emit('end');
      __.assertThat(this.redisClientMock.isConnected, __.is(false));
      this.redisClientMock.emit('connect');
      __.assertThat(this.redisClientMock.isConnected, __.is(true));
    });
  });

  describe('get key', function() {
    before(init);

    assertCallingCreateClient('getKey');

    it('should call redis with requested key', function * () {
      const key = 'much key so wow';
      yield this.cache.getKey(key);
      __.assertThat(this.redisClientMock.getAsync.calledWith(key), __.is(true));
    });

    it('should resolve key from redis', function * () {
      const value = yield this.cache.getKey('some key');
      __.assertThat(value, __.is(this.cachedValue));
    });

    it('should not call redis.get when redis is not connected', function * () {
      this.redisClientMock.emit('end');
      const value = yield this.cache.getKey('some key');
      __.assertThat(this.redisClientMock.getAsync.called, __.is(false));
      __.assertThat(value, __.is(__.undefined()));
    });
  });

  describe('set key', function() {
    before(init);

    assertCallingCreateClient('setKey');

    it('should call redis.set with requested key and value', function () {
      const key = 'llave';
      const value = 'valor';
      this.cache.setKey(key, value);
      __.assertThat(this.redisClientMock.setAsync.calledWith(key, value), __.is(true));
    });

    it('should call redis.setex when called with expInSeconds', function () {
      const key = 'مفتاح';
      const value = 'القيمة';
      const exp = 123;
      this.cache.setKey(key, value, exp);
      __.assertThat(this.redisClientMock.setexAsync.calledWith(key, exp, value), __.is(true));
    });

    it('should not call redis.set when redis is down', function() {
      this.redisClientMock.emit('end');
      this.cache.setKey(1, 2);
      __.assertThat(this.redisClientMock.setAsync.called, __.is(false));
    });

    it('should not call redis.setex when redis is down', function() {
      this.redisClientMock.emit('end');
      this.cache.setKey(1, 2, 3);
      __.assertThat(this.redisClientMock.setexAsync.called, __.is(false));
    });

    it('should throw an error if called without a value', function() {
      __.assertThat(() => this.cache.setKey('just a key'), __.throws(
        __.hasProperty('message', __.startsWith('You are trying to cache undefined value'))
      ));
    });
  });

  describe('get hash key', function() {
    before(init);

    assertCallingCreateClient('getHashKey');

    it('should call redis.hget with requested hash and key', function * () {
      const hash = 'potato';
      const key = 42;
      yield this.cache.getHashKey(hash, key);
      __.assertThat(this.redisClientMock.hgetAsync.calledWith(hash, key), __.is(true));
    });

    it('should resolve key from redis', function * () {
      const value = yield this.cache.getHashKey('some hash', 'some key');
      __.assertThat(value, __.is(this.cachedValue));
    });

    it('should not call redis.hget when redis is not connected', function * () {
      this.redisClientMock.emit('end');
      const value = yield this.cache.getHashKey();
      __.assertThat(this.redisClientMock.hgetAsync.called, __.is(false));
      __.assertThat(value, __.is(__.undefined()));
    });
  });

  describe('set hash key', function() {
    before(init);

    assertCallingCreateClient('setHashKey');

    it('should call redis.hset with requested hash, key and value', function () {
      const hash = 'ish';
      const key = '⚷';
      const value = '⚩';
      this.cache.setHashKey(hash, key, value);
      __.assertThat(this.redisClientMock.hsetAsync.calledWith(hash, key, value), __.is(true));
    });

    it('should not call redis.hset when redis is down', function() {
      this.redisClientMock.emit('end');
      this.cache.setHashKey(1, 2, 3);
      __.assertThat(this.redisClientMock.hsetAsync.called, __.is(false));
    });

    it('should throw an error if called without a value', function() {
      __.assertThat(() => this.cache.setHashKey('just a hash'), __.throws(
        __.hasProperty('message', __.startsWith('You are trying to cache undefined value'))
      ));
    });
  });
});
