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
  return cache.client.getAsync(cacheKeyName).then(val => { return val; });
}

function setKey(cacheKeyName, value, expInSeconds) {
  if (value) {
    let cache = new Cache();
    if (expInSeconds) {
      cache.client.setexAsync(cacheKeyName, expInSeconds, value);
    } else {
      cache.client.setAsync(cacheKeyName, value);
    }
  } else {
    throw new Error(`You are trying to cache undefined value to key ${cacheKeyName}!`);
  }
}

// Get global auth0 user from cache hash of users by uuid in Redis. 
function getHashKey(hashName, hashKey){
  let cache = new Cache();
  return cache.client.hgetAsync(hashName, hashKey).then(val => { return val; });
}

// Update global auth0 user cache hash of users by uuid in Redis. 
function setHashKey(hashName, hashKey, value) {
  if (value) {
    let cache = new Cache();
    cache.client.hsetAsync(hashName, hashKey, value);
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
