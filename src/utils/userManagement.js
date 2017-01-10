// User details manilulation on auth0. 
'user strict';
const config = require('../config');
const logger = require('../logger').getLogger(module);
const cache = require('../helpers/cache');
const analytics = require('./analytics');
const AuthenticationClient = require('auth0').AuthenticationClient;
const ManagementClient = require('auth0').ManagementClient;
const request = require('request-promise');
const promisify = require('es6-promisify');
const jwtDecode = require('jwt-decode');
const moment = require('moment');
const _ = require('lodash');

const userCacheKeyName = 'auth0_users_by_uuid';
const ONE_DAY = 60 * 60 * 24;
const userHeaderKey = 'x-user-profile';


let auth0Management = null;

// Singleton cache class to get auth0 Management client.
class Management {
  constructor(token) {
    if (!auth0Management) {
      if (!config.get('AUTH0_DOMAIN')) { throw new Error('You need to define AUTH0_DOMAIN environemnt variable!'); }
      this.client = new ManagementClient({
        domain: config.get('AUTH0_DOMAIN'),
        token: token
      });
      auth0Management = this;
    }
    return auth0Management;
  }
}

// Update user details by user uuid using Management API or Cache.
function updateUserDetails(user_uuid, userData) {
  return getUserDetails(user_uuid)
    .then(user => {
      if (user) {
        return getApiToken()
          .then(token => { 
            const auth0 = new Management(token); 
            return auth0.client;
          })
          .then(auth0 => {
            return auth0.updateUser({ id: user.user_id }, userData)
              .then(response => {
                logger.info(response.app_metadata.dorbel_user_id, 'Succesfully updated auth0 user details');
                cache.setHashKey(userCacheKeyName, response.app_metadata.dorbel_user_id, JSON.stringify(response));
                analytics.identify(response);
              });
          });
      } else {
        logger.info({ user_uuid }, 'Failed to update user details as user was not found');
        return user;
      }
    });
}

// Get user details by user uuid from Management API or Cache.
function getUserDetails(user_uuid) {
  return cache.getHashKey(userCacheKeyName, user_uuid)
    .then(result => {
      if (result) {
        return JSON.parse(result);
      } else {
        return getApiToken()
          .then(token => { 
            const auth0 = new Management(token); 
            return auth0.client;
          })
          .then(auth0 => {
            return auth0.getUsers({
              fields: 'user_id,name,email,user_metadata,app_metadata,picture,link,identities,given_name,family_name', // User details field names to get from API.
              q: 'app_metadata.dorbel_user_id: ' + user_uuid // Query to get users by app metadata dorbel user id.
            });
          })
          .then(user => {
            let flatUser = user[0]; // Removing hierarchy as got only one user.
            if (flatUser) {
              cache.setHashKey(userCacheKeyName, user_uuid, JSON.stringify(flatUser));
              logger.trace({ user_uuid }, 'Got user info from Management API by uuid.');
            } else {
              logger.warn({ user_uuid }, 'Did not get user details from auth0');
            }
            return flatUser;
          });
      }
    });
}

function getPublicProfile(user_uuid) {
  return getUserDetails(user_uuid)
  .then(user => {
    const publicProfile = {
      email : _.get(user, 'user_metadata.email') || user.email,
      first_name: _.get(user, 'user_metadata.first_name') || user.given_name,
      last_name: _.get(user, 'user_metadata.last_name') || user.family_name,
      phone: _.get(user, 'user_metadata.phone'),
      picture: user.picture
    };

    if (_.get(user, 'identities[0].provider') === 'facebook') {
      publicProfile.facebook_link = user.link;
    }
    
    return publicProfile;
  });
}

function getApiToken() {
  if (!config.get('AUTH0_DOMAIN')) { throw new Error('You need to define AUTH0_DOMAIN environemnt variable!'); }
  if (!config.get('AUTH0_API_CLIENT_ID')) { throw new Error('You need to define AUTH0_API_CLIENT_ID environemnt variable!'); }
  if (!config.get('AUTH0_API_CLIENT_SECRET')) { throw new Error('You need to define AUTH0_API_CLIENT_SECRET environemnt variable!'); }
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
  if (!config.get('AUTH0_DOMAIN')) { throw new Error('You need to define AUTH0_DOMAIN environemnt variable!'); }
  if (!config.get('AUTH0_FRONT_CLIENT_ID')) { throw new Error('You need to define AUTH0_FRONT_CLIENT_ID environemnt variable!'); }
  const token = getAccessTokenFromHeader(this.request);
  const auth0 = new AuthenticationClient({
    domain: config.get('AUTH0_DOMAIN'),
    clientId: config.get('AUTH0_FRONT_CLIENT_ID')
  });

  // we clear this anyway so it cannot be hijacked 
  this.request.headers[userHeaderKey] = undefined;

  if (token) {
    yield cache.getKey(token)
      .then(result => {
        if (!result) {
          const getInfo = promisify(auth0.tokens.getInfo, auth0.tokens);
          return getInfo(token).then(response => {
            let exp = jwtDecode(token).exp; // Token expiration seconds in unix. 
            let now = moment().unix(); // Now seconds in unix.
            let ttl = exp - now; // Time to live in cache in seconds.
            cache.setKey(token, JSON.stringify(response), ttl);
            cache.setHashKey(userCacheKeyName, response.app_metadata.dorbel_user_id, JSON.stringify(response));
            return response;
          });
        } else {
          let parsedResult = JSON.parse(result);
          return parsedResult;
        }
      })
      .then(data => {
        this.request.headers[userHeaderKey] = JSON.stringify({
          id: data.dorbel_user_id,
          email: data.email,
          name: data.name,
          role: _.get(data, 'app_metadata.role')
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
  parseAuthToken,
  getPublicProfile
};
