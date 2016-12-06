// Redis cache helper.
'use strict';

const config = require('../config');
const redis = require('redis');
const bluebird = require('bluebird'); bluebird.promisifyAll(redis.RedisClient.prototype);
let cacheInstance = null;

// Singleton cache class to get Redis client.
class Cache {
  constructor() {
    if (!cacheInstance) { 
      if (!config.get('REDIS_HOST')) { throw new Error('You need to define REDIS_HOST environemnt variable!'); }      
      this.client = redis.createClient(6379, config.get('REDIS_HOST')); 
      cacheInstance = this;
    }    
    return cacheInstance;
  }
}

function getKey(cacheKeyName) {
  let cache = new Cache();
  return cache.client.getAsync(cacheKeyName).then(val => { return JSON.parse(val); });
}

function setKey(cacheKeyName, value, expInSeconds) {
  let cache = new Cache();
  if (expInSeconds) {
    return cache.client.setexAsync(cacheKeyName, expInSeconds, JSON.stringify(value));
  } else {
    return cache.client.setAsync(cacheKeyName, JSON.stringify(value));
  }
}

// Get global auth0 user from cache hash of users by uuid in Redis. 
function getHashKey(hashName, hashKey){
  let cache = new Cache();
  return cache.client.hgetAsync(hashName, hashKey).then(val => { return JSON.parse(val); });
}

// Update global auth0 user cache hash of users by uuid in Redis. 
function setHashKey(hashName, hashKey, value) {
  let cache = new Cache();
  return cache.client.hsetAsync(hashName, hashKey, JSON.stringify(value));
}

module.exports = {
  getKey,
  setKey,
  getHashKey,
  setHashKey
};
