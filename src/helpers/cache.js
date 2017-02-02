// Redis cache helper.
'use strict';

const config = require('../config');
const redis = require('redis');
const bluebird = require('bluebird'); bluebird.promisifyAll(redis.RedisClient.prototype);
const logger = require('../logger').getLogger(module);

if (!config.get('REDIS_HOST')) { throw new Error('You need to define REDIS_HOST environment variable!'); }

const RECONNECT_REDIS_CLIENT_AFTER_FAIL_MS = 60 * 1000;

let isRedisConnected = false;

let cache = redis.createClient(6379, config.get('REDIS_HOST'), {
  retry_strategy: (options) => {
    options.toString();
    return RECONNECT_REDIS_CLIENT_AFTER_FAIL_MS;
  }
}).on('end', () => {
  isRedisConnected = false;
  logRedisDown();
}).on('connect', () => {
  isRedisConnected = true;
  logger.info('cache helper: connected to Redis');
}).on('reconnecting', () => {
  logger.info('cache helper: trying to reconnect to redis');
});

function logRedisDown() {
  let errorMessage =
    `cache helper: could not connect to Redis. Will retry in ${RECONNECT_REDIS_CLIENT_AFTER_FAIL_MS / 1000} seconds`;
  logger.error(errorMessage);
}


function getKey(cacheKeyName) {
  return isRedisConnected ?
    cache.client.getAsync(cacheKeyName).then(val => { return val; })
    : new Promise((resolve) => { resolve(); });
}

function setKey(cacheKeyName, value, expInSeconds) {
  if (value) {
    if (isRedisConnected) {
      if (expInSeconds) {
        cache.client.setexAsync(cacheKeyName, expInSeconds, value);
      }
      else {
        cache.client.setAsync(cacheKeyName, value);
      }
    }
  }
  else {
    throw new Error(`You are trying to cache undefined value to key ${cacheKeyName}!`);
  }
}

// Get global auth0 user from cache hash of users by uuid in Redis. 
function getHashKey(hashName, hashKey) {
  return isRedisConnected ?
    cache.client.hgetAsync(hashName, hashKey).then(val => { return val; })
    : new Promise((resolve) => { resolve(); });
}

// Update global auth0 user cache hash of users by uuid in Redis. 
function setHashKey(hashName, hashKey, value) {
  if (value) {
    if (isRedisConnected) {
      cache.client.hsetAsync(hashName, hashKey, value);
    }
  } else {
    throw new Error(`You are trying to cache undefined value to hash ${hashName} with key ${hashKey}!`);
  }
}

module.exports = {
  getKey,
  setKey,
  getHashKey,
  setHashKey
};
