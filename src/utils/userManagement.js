// Get user details from auth0 API. 
'user strict';

const config = require('../config');
const logger = require('../logger').getLogger(module);
const AuthenticationClient = require('auth0').AuthenticationClient;
const ManagementClient = require('auth0').ManagementClient;
const request = require('request-promise');
const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
const promisify = require('es6-promisify');
const jwtDecode = require('jwt-decode');
const moment = require('moment');
const ONE_HOUR = 60 * 60;
const ONE_DAY = ONE_HOUR * 24;
let cacheInstance = null;

// Singleton cache class to get the client.
class Cache {
  constructor() {
    if (!cacheInstance) { cacheInstance = this; }
    this.client = redis.createClient(6379, config.get('REDIS_HOST'));
    return cacheInstance;
  }
}

// Get user details by user uuid from Management API.
function getUserDetails(uuid) {
  let cache = new Cache();
  const cacheKeyName = 'auth0_users_by_uuid';

  return cache.client.hgetAsync(cacheKeyName, uuid)
    .then(result => {
      if (result) {
        logger.debug({
          result
        }, 'Got user info from Cache by uuid.');
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
            let flatUser = user[0]; // Removing hierarchy as got only one user.
            cache.client.hset(cacheKeyName, uuid, JSON.stringify(flatUser));
            logger.debug({
              flatUser
            }, 'Got user info from Management API by uuid.');
            return flatUser;
          });
      }
    });
}

function getApiToken() {
  let cache = new Cache();
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

  return cache.client.getAsync(cacheKeyName)
    .then(result => {
      if (result) {
        return result;
      } else {
        return request(options)
          .then(result => {
            cache.client.setex(cacheKeyName, ONE_DAY, result.access_token);
            return result.access_token;
          });
      }
    });
}

// Get user details by user token from Auth API.
function* parseAuthToken(next) {
  const token = getAccessTokenFromHeader(this.request);
  const auth0 = new AuthenticationClient({
    domain: config.get('AUTH0_DOMAIN'),
    clientId: config.get('AUTH0_FRONT_CLIENT_ID')
  });

  if (token) {
    logger.info('Getting user profile info for API.');
    let cache = new Cache();

    yield cache.client.getAsync(token)
      .then(result => {
        if (!result) {
          const getInfo = promisify(auth0.tokens.getInfo, auth0.tokens);
          return getInfo(token).then(response => {
            logger.debug({
              response
            }, 'Got user info from Auth API by token.');
            let exp = jwtDecode(token).exp; // Token expiration seconds in unix. 
            let now = moment().unix(); // Now seconds in unix.
            let ttl = exp - now; // Time to live in cache in seconds.
            cache.client.setex(token, ttl, JSON.stringify(response));
            return response;
          });
        } else {
          logger.debug({
            result
          }, 'Got user info from Cache by token.');
          return JSON.parse(result);
        }
      })
      .then(data => {
        this.request.headers['x-user-profile'] = JSON.stringify({
          id: data.dorbel_user_id,
          email: data.email,
          name: data.name
        });
      });
  }

  yield next;
}

function getAccessTokenFromHeader(req) {
  if (req.headers.authorization) {
    var tokenMatch = req.headers.authorization.match(/^bearer (.+)/i);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }
}

module.exports = {
  getUserDetails,
  parseAuthToken
};
