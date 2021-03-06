// Redis cache helper.
'use strict';

const redis = require('redis');
const bluebird = require('bluebird'); bluebird.promisifyAll(redis.RedisClient.prototype);
const logger = require('../logger').getLogger(module);

const HELPER_NAME = 'Redis cache helper';
class Cache {
  static get() {
    if (this.redisClient) {
      return this.redisClient;
    }
    else {
      const REDIS_HOST = process.env.REDIS_HOST;
      const REDIS_PORT = process.env.REDIS_PORT || 6379;
      const REDIS_RECONNECT_AFTER_FAIL_MS = process.env.REDIS_RECONNECT_AFTER_FAIL_MS || 60 * 1000;
      const REDIS_CONNECT_TIMEOUT_MS = process.env.REDIS_CONNECT_TIMEOUT_MS || 2 * 1000;

      if (!REDIS_HOST) {
        logAndThrowError(`You need to define REDIS_HOST environment variable! HOST:${REDIS_HOST} PORT:${REDIS_PORT}`);
      }

      this.redisClient = redis.createClient(REDIS_PORT, REDIS_HOST, {
        retry_strategy: (options) => {
          if (options.total_retry_time > REDIS_CONNECT_TIMEOUT_MS) {
            logger.error(`${HELPER_NAME}: Couldn't connect to Redis host: ${REDIS_HOST}:${REDIS_PORT} after ${REDIS_CONNECT_TIMEOUT_MS} ms`);
            return REDIS_RECONNECT_AFTER_FAIL_MS;
          }
        }
      }).on('end', () => {
        this.redisClient.isConnected = false;
        logger.error(`${HELPER_NAME}: could not connect to Redis. Will retry in ${REDIS_RECONNECT_AFTER_FAIL_MS / 1000} seconds`);
      }).on('connect', () => {
        this.redisClient.isConnected = true;
        logger.info(`${HELPER_NAME}: connected to Redis`);
      }).on('reconnecting', () => {
        logger.info(`${HELPER_NAME}: trying to reconnect to redis`);
      });

      // Set to true since the connect event might have not happened yet.
      // Commands will be queued and executed once a connection is available.
      this.redisClient.isConnected = true;

      return this.redisClient;
    }
  }
}

function getKey(cacheKeyName) {
  let cache = Cache.get();
  return cache.isConnected ?
    cache.getAsync(cacheKeyName).then(val => { return val; })
    : redisDownResult();
}

function setKey(cacheKeyName, value, expInSeconds) {
  let cache = Cache.get();
  if (value) {
    if (cache.isConnected) {
      if (expInSeconds) {
        cache.setexAsync(cacheKeyName, expInSeconds, value);
      }
      else {
        cache.setAsync(cacheKeyName, value);
      }
    }
    else {
      logger.warn(`${HELPER_NAME}: Redis is down, cache wasn't set. cacheKeyName: ${cacheKeyName}, value: ${value}`);
    }
  }
  else {
    logAndThrowError(`You are trying to cache undefined value to key ${cacheKeyName}!`);
  }
}

// Gets a value stored in a Redis hash https://redis.io/commands/hget
function getHashKey(hashName, hashKey) {
  logger.debug({ hashName, hashKey }, 'Starting getHashKey');
  let cache = Cache.get();
  return cache.isConnected ?
    cache.hgetAsync(hashName, hashKey).then(val => { return val; })
    : redisDownResult();
}

// Sets a value inside a Redis hash https://redis.io/commands/hset
function setHashKey(hashName, hashKey, value) {
  logger.debug({ hashName, hashKey, value }, 'Starting setHashKey');
  let cache = Cache.get();
  if (value) {
    if (cache.isConnected) {
      cache.hsetAsync(hashName, hashKey, value);
    }
    else {
      logger.warn(`${HELPER_NAME}: Redis is down, cache wasn't set. hashName: ${hashName}, hashKey: ${hashKey}, value: ${value}`);
    }
  } else {
    logAndThrowError(`You are trying to cache undefined value to hash ${hashName} with key ${hashKey}!`);
  }
}

function redisDownResult() {
  logger.warn(`${HELPER_NAME}: Redis is down, returning undefined`);
  return new Promise((resolve) => { resolve(undefined); });
}

function logAndThrowError(message) {
  logger.error(`${HELPER_NAME}: ${message}`);
  throw new Error(message);
}

module.exports = {
  getKey,
  setKey,
  getHashKey,
  setHashKey
};
