// User details manipulation on auth0.
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
const userHeaderKey = 'x-user-profile';

// Update user details by user uuid using Management API or Cache.
function updateUserDetails(user_uuid, userData) {
  logger.debug({ user_uuid, userData }, 'Starting updateUserDetails');

  if (!user_uuid) {
    throw new Error('Cant update user details. Supplied user_uuid was undefined!');
  }

  return getUserDetails(user_uuid)
    .then(user => {
      if (user) {
        return getApiToken()
          .then(token => {
            const auth0 = new ManagementClient({
              domain: config.get('AUTH0_DOMAIN'),
              token: token
            });
            return auth0.client;
          })
          .then(auth0Client => {
            logger.debug({ auth0_user_id: user.user_id }, 'Starting auth0.updateUser');             
            return auth0Client.updateUser({ id: user.user_id }, userData)
              .then(response => {
                logger.info({ user_uuid: response.app_metadata.dorbel_user_id }, 'Succesfully updated auth0 user details');
                cache.setHashKey(userCacheKeyName, response.app_metadata.dorbel_user_id, JSON.stringify(response));
                analytics.identify(response);
              });
          });
      } else {
        logger.error({ user_uuid }, 'Failed to update user details as user was not found');
        return user;
      }
    });
}

// Get user details by user uuid from Management API or Cache.
function getUserDetails(user_uuid) {
  logger.debug({ user_uuid }, 'Starting getUserDetails');
  
  if (!user_uuid) {
    throw new Error('Cant get user details. Supplied user_uuid was undefined!');
  }

  return cache.getHashKey(userCacheKeyName, user_uuid)
    .then(result => {
      if (result) {
        return JSON.parse(result);
      } else {
        return getApiToken()
          .then(token => {
            const auth0 = new ManagementClient({
              domain: config.get('AUTH0_DOMAIN'),
              token: token
            });
            return auth0.client;
          })
          .then(auth0Client => {
            logger.debug({ user_uuid }, 'Starting auth0.getUsers');             
            return auth0Client.getUsers({
              fields: 'user_id,name,email,user_metadata,app_metadata,picture,link,identities,given_name,family_name', // User details field names to get from API.
              q: 'app_metadata.dorbel_user_id: ' + user_uuid // Query to get users by app metadata dorbel user id.
            });
          })
          .then(user => {
            logger.debug({ user_uuid, user }, 'Got user details from auth0.getUsers');             
            let flatUser = user[0]; // Removing hierarchy as got only one user.
            if (flatUser) {
              cache.setHashKey(userCacheKeyName, user_uuid, JSON.stringify(flatUser));
              logger.debug({ user_uuid }, 'Got user info from Management API by uuid.');
            } else {
              logger.warn({ user_uuid }, 'Did not get user details from auth0');
            }
            return flatUser;
          });
      }
    });
}

function getPublicProfile(user_uuid) {
  if (!user_uuid) {
    throw new Error('Cant get public user profile. Supplied user_uuid was undefined!');
  }

  return getUserDetails(user_uuid)
  .then(user => {
    const publicProfile = {
      email : _.get(user, 'user_metadata.email') || user.email,
      first_name: _.get(user, 'user_metadata.first_name') || user.given_name,
      last_name: _.get(user, 'user_metadata.last_name') || user.family_name,
      phone: _.get(user, 'user_metadata.phone'),
      picture: user.picture,
      role: _.get(user, 'app_metadata.role')
    };

    if (_.get(user, 'identities[0].provider') === 'facebook') {
      publicProfile.facebook_link = user.link;
    }

    return publicProfile;
  });
}

function getApiToken() {
  logger.debug('Starting getApiToken');
  if (!config.get('AUTH0_DOMAIN')) { throw new Error('You need to define AUTH0_DOMAIN environment variable!'); }
  if (!config.get('AUTH0_API_CLIENT_ID')) { throw new Error('You need to define AUTH0_API_CLIENT_ID environment variable!'); }
  if (!config.get('AUTH0_API_CLIENT_SECRET')) { throw new Error('You need to define AUTH0_API_CLIENT_SECRET environment variable!'); }
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
            logger.debug(result, 'Got API Token from auth0 v2 API');
            cache.setKey(cacheKeyName, result.access_token, result.expires_in);
            return result.access_token;
          });
      }
    });
}

function getProfileFromAuth0(idToken) {
  if (!config.get('AUTH0_DOMAIN')) { throw new Error('You need to define AUTH0_DOMAIN environment variable!'); }
  if (!config.get('AUTH0_FRONT_CLIENT_ID')) { throw new Error('You need to define AUTH0_FRONT_CLIENT_ID environment variable!'); }

  // AuthenticationClient is per-user and must be initialized every time
  const client = new AuthenticationClient({
    domain: config.get('AUTH0_DOMAIN'),
    clientId: config.get('AUTH0_FRONT_CLIENT_ID')
  });

  return promisify(client.tokens.getInfo, client.tokens)(idToken);
}

// Get user details by user token from Auth API or Cache.
function* getProfileFromIdToken(idToken) {
  const ttl = getTokenTTL(idToken);
  if (ttl < 0) {
    return;
  }

  // Try to get user profile from cache
  const cacheResult = yield cache.getKey(idToken);
  if (cacheResult) {
    return JSON.parse(cacheResult);
  }

  // If not in cache get user profile from auth0
  const profile = yield getProfileFromAuth0(idToken);

  cache.setKey(idToken, JSON.stringify(profile), ttl);
  let dorbelUserId = profile.dorbel_user_id;
  if (dorbelUserId) {
    cache.setHashKey(userCacheKeyName, dorbelUserId, JSON.stringify(profile));
  }

  return profile;
}

// Take the id-token from the header, fetch the profile, and attach it to the proxied request
function* parseAuthToken(next) {
  // we clear this anyway so it cannot be hijacked
  this.request.headers[userHeaderKey] = undefined;

  const token = getAccessTokenFromHeader(this.request);
  // If no token, continue
  if (!token) {
    return yield next;
  }

  const profile = yield getProfileFromIdToken(token);

  if (profile) {
    // Add profile to request headers. This request is proxied to the backend APIS
    this.request.headers[userHeaderKey] = JSON.stringify({
      id: profile.dorbel_user_id,
      email: profile.email,
      name: profile.name,
      role: _.get(profile, 'app_metadata.role')
    });
  }

  yield next;
}

function getTokenTTL(token) {
  let exp = jwtDecode(token).exp; // Token expiration seconds in unix.
  let now = moment().unix(); // Now seconds in unix.
  return exp - now; // Time to live in cache in seconds.
}

function getAccessTokenFromHeader(req) {
  if (req.headers.authorization) {
    var tokenMatch = req.headers.authorization.match(/^bearer (.+)/i);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }
}

function isUserAdmin(user) {
  return user.role === 'admin';
}

module.exports = {
  getUserDetails,
  updateUserDetails,
  parseAuthToken,
  getProfileFromIdToken,
  getPublicProfile,
  isUserAdmin
};
