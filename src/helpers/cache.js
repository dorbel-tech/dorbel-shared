// Redis cache helper.
'use strict';

const config = require('../config');
const redis = require('redis');
const bluebird = require('bluebird'); bluebird.promisifyAll(redis.RedisClient.prototype);
const logger = require('../logger').getLogger(module);

const HELPER_NAME = 'Redis cache helper';
const REDIS_HOST = config.get('REDIS_HOST');
const REDIS_PORT = config.get('REDIS_PORT');
const REDIS_RECONNECT_AFTER_FAIL_MS = config.get('REDIS_RECONNECT_AFTER_FAIL_MS') || 60 * 1000;
const REDIS_CONNECT_TIMEOUT_MS = config.get('REDIS_CONNECT_TIMEOUT_MS') || 2 * 1000;

let isRedisConnected = false;

if (!REDIS_HOST || !REDIS_PORT) {
  logAndTrowError(`You need to define REDIS_HOST and REDIS_PORT environment variables! HOST:${REDIS_HOST} PORT:${REDIS_PORT}`);
}

let redisClient = redis.createClient(REDIS_PORT, REDIS_HOST, {
  retry_strategy: (options) => {
    if (options.total_retry_time > REDIS_CONNECT_TIMEOUT_MS) {
      logger.error(`${HELPER_NAME}: Couldn't connect to Redis host: ${REDIS_HOST}:${REDIS_PORT} after ${REDIS_CONNECT_TIMEOUT_MS} ms`);
      return REDIS_RECONNECT_AFTER_FAIL_MS;
    }
  }
}).on('end', () => {
  isRedisConnected = false;
  logger.error(`${HELPER_NAME}: could not connect to Redis. Will retry in ${REDIS_RECONNECT_AFTER_FAIL_MS / 1000} seconds`);
}).on('connect', () => {
  isRedisConnected = true;
  logger.info(`${HELPER_NAME}: connected to Redis`);
}).on('reconnecting', () => {
  logger.info(`${HELPER_NAME}: trying to reconnect to redis`);
});

function getKey(cacheKeyName) {
  return isRedisConnected ?
    redisClient.getAsync(cacheKeyName).then(val => { return val; })
    : redisDownResult();
}

function setKey(cacheKeyName, value, expInSeconds) {
  if (value) {
    if (isRedisConnected) {
      if (expInSeconds) {
        redisClient.setexAsync(cacheKeyName, expInSeconds, value);
      }
      else {
        redisClient.setAsync(cacheKeyName, value);
      }
    }
  }
  else {
    logAndTrowError(`You are trying to cache undefined value to key ${cacheKeyName}!`);
  }
}

// Get global auth0 user from cache hash of users by uuid in Redis. 
function getHashKey(hashName, hashKey) {
  return isRedisConnected ?
    redisClient.hgetAsync(hashName, hashKey).then(val => { return val; })
    : redisDownResult();
}

// Update global auth0 user cache hash of users by uuid in Redis. 
function setHashKey(hashName, hashKey, value) {
  if (value) {
    if (isRedisConnected) {
      redisClient.hsetAsync(hashName, hashKey, value);
    }
  } else {
    logAndTrowError(`You are trying to cache undefined value to hash ${hashName} with key ${hashKey}!`);
  }
}

function redisDownResult() {
  logger.warn(`${HELPER_NAME}: Redis is down, returning undefined`);
  return new Promise((resolve) => { resolve(undefined); });
}

function logAndTrowError(message) {
  logger.error(`${HELPER_NAME}: ${message}`);
  throw new Error(message);
}

module.exports = {
  getKey,
  setKey,
  getHashKey,
  setHashKey
};
