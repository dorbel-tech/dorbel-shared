// User details manilulation on auth0. 
'user strict';

const config = require('../config');
const logger = require('../logger').getLogger(module);
const cache = require('../helpers/cache');
const AuthenticationClient = require('auth0').AuthenticationClient;
const ManagementClient = require('auth0').ManagementClient;
const request = require('request-promise');
const promisify = require('es6-promisify');
const jwtDecode = require('jwt-decode');
const moment = require('moment');
let auth0Management = null;
const ONE_HOUR = 60 * 60;
const ONE_DAY = ONE_HOUR * 24;
const userCacheKeyName = 'auth0_users_by_uuid';

// Singleton cache class to get auth0 Management client.
class Management {
  constructor(token) {
    if (!auth0Management) { auth0Management = this; }
    this.client = new ManagementClient({
      token: token,
      domain: config.get('AUTH0_DOMAIN')
    });
    return auth0Management;
  }
}

// Update user details by user uuid using Management API or Cache.
function updateUserDetails(user_uuid, userData) {
  return getUserDetails(user_uuid)
    .then(user => {
      return getApiToken()
        .then(token => { return new Management(token).client; })
        .then(auth0 => {
          return auth0.updateUser({ id: user.user_id }, userData)
            .then(response => {
              logger.info({ response }, 'Succesfully updated auth0 user details');
              cache.setHashKey(userCacheKeyName, response.app_metadata.dorbel_user_id, response);
            });
        });
    });
}

// Get user details by user uuid from Management API or Cache.
function getUserDetails(user_uuid) {
  return cache.getHashKey(userCacheKeyName, user_uuid)
    .then(result => {
      if (result) {
        logger.debug({ result }, 'Got user info from Cache by uuid.');
        return JSON.parse(result);
      } else {
        return getApiToken()
          .then(token => { return new Management(token).client; })
          .then(auth0 => {
            return auth0.getUsers({
              fields: 'user_id,name,email,user_metadata,app_metadata', // User details field names to get from API.
              q: 'app_metadata.dorbel_user_id: ' + user_uuid // Query to get users by app metadata dorbel user id.
            });
          })
          .then(user => {
            let flatUser = user[0]; // Removing hierarchy as got only one user.
            cache.setHashKey(userCacheKeyName, user_uuid, flatUser);
            logger.debug({ flatUser }, 'Got user info from Management API by uuid.');
            return flatUser;
          });
      }
    });
}

function getApiToken() {
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

  return cache.getKey(cacheKeyName)
    .then(result => {
      if (result) {
        return result;
      } else {
        return request(options)
          .then(result => {
            cache.setKey(cacheKeyName, result.access_token, ONE_DAY);
            return result.access_token;
          });
      }
    });
}

// Get user details by user token from Auth API or Cache.
function* parseAuthToken(next) {
  const token = getAccessTokenFromHeader(this.request);
  const auth0 = new AuthenticationClient({
    domain: config.get('AUTH0_DOMAIN'),
    clientId: config.get('AUTH0_FRONT_CLIENT_ID')
  });

  if (token) {
    logger.info('Getting user profile info for API.');

    yield cache.getKey(token)
      .then(result => {
        if (!result) {
          const getInfo = promisify(auth0.tokens.getInfo, auth0.tokens);
          return getInfo(token).then(response => {
            logger.debug({ response }, 'Got user info from Auth API by token.');
            let exp = jwtDecode(token).exp; // Token expiration seconds in unix. 
            let now = moment().unix(); // Now seconds in unix.
            let ttl = exp - now; // Time to live in cache in seconds.
            cache.setKey(token, response, ttl);
            cache.setHashKey(userCacheKeyName, response.app_metadata.dorbel_user_id, response);
            return response;
          });
        } else {
          logger.debug({ result }, 'Got user info from Cache by token.');
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
  updateUserDetails,
  parseAuthToken
};
