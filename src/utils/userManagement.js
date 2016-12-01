// Get user details from auth0 API. 
'user strict';

const config = require('../config');
const logger = require('../logger').getLogger(module);
const ManagementClient = require('auth0').ManagementClient;
const request = require('request-promise');
const redis = require('redis');
const bluebird = require('bluebird'); bluebird.promisifyAll(redis.RedisClient.prototype);
const ONE_HOUR = 60 * 60;
const ONE_DAY = ONE_HOUR * 24;

// TODO: Implement user details caching.
function getUserDetails(uuid) {
  const cache = redis.createClient(6379, config.get('REDIS_HOST'));
  const cacheKeyName = 'auth0_users';

  return cache.hgetAsync(cacheKeyName, uuid)
    .then(result => {
      if (result) {
        return JSON.parse(result);
      } else {
        return getApiToken()
          .then(token => {
            return new ManagementClient({
              token: token,
              domain: config.get('AUTH0_DOMAIN')
            });
          })
          .then(auth0 => {
            return auth0.getUsers({
              fields: 'name,email,user_metadata,app_metadata', // User details field names to get from API.
              q: 'app_metadata.dorbel_user_id: ' + uuid // Query to get users by app metadata dorbel user id.
            });
          })
          .then(user => {
            cache.hset(cacheKeyName, uuid, JSON.stringify(user));
            logger.debug(user);
            return user;
          });
      }
    });
}

// TODO: Implement token caching and define expiration.
function getApiToken() {
  const cache = redis.createClient(6379, config.get('REDIS_HOST'));
  const cacheKeyName = 'auth0_management_api_token';
  const authDomain = 'https://' + config.get('AUTH0_DOMAIN');
  const options = {
    method: 'POST',
    url: authDomain + '/oauth/token',
    body: {
      'client_id': config.get('AUTH0_API_CLIENT_ID'),
      'client_secret': config.get('AUTH0_API_CLIENT_SECRET'),
      'audience': authDomain + '/api/v2/',
      'grant_type': 'client_credentials'
    },
    json: true
  };

  return cache.getAsync(cacheKeyName)
    .then(result => {
      if (result) {
        return result;
      } else {
        return request(options)
          .then(result => {
            cache.setex(cacheKeyName, ONE_DAY, result.access_token);
            return result.access_token;
          });
      }
    });
}

module.exports = {
  getUserDetails
};
