// Redis cache helper.
'use strict';

const config = require('../config');
const redis = require('redis');
const bluebird = require('bluebird'); bluebird.promisifyAll(redis.RedisClient.prototype);
let cacheInstance = null;

// Singleton cache class to get Redis client.
class Cache {
  constructor() {
    if (!cacheInstance) { cacheInstance = this; }
    this.client = redis.createClient(6379, config.get('REDIS_HOST'));
    return cacheInstance;
  }
}

function getKey(cacheKeyName) {
  let cache = new Cache();
  return cache.client.getAsync(cacheKeyName);
}

function setKey(cacheKeyName, value, expInSeconds) {
  let cache = new Cache();
  if (expInSeconds) {
    cache.client.setex(cacheKeyName, expInSeconds, JSON.stringify(value));
  } else {
    cache.client.set(cacheKeyName, JSON.stringify(value));
  }
}

// Get global auth0 user from cache hash of users by uuid in Redis. 
function getHashKey(hashName, hashKey){
  let cache = new Cache();
  return cache.client.hgetAsync(hashName, hashKey);
}

// Update global auth0 user cache hash of users by uuid in Redis. 
function setHashKey(hashName, hashKey, value) {
  let cache = new Cache();
  cache.client.hset(hashName, hashKey, JSON.stringify(value));
}

module.exports = {
  getKey,
  setKey,
  getHashKey,
  setHashKey
};
