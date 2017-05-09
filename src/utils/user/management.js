// User details manipulation on auth0.
'use strict';
const _ = require('lodash');
const logger = require('../../logger').getLogger(module);
const cache = require('../../helpers/cache');
const analytics = require('../analytics');
const AuthenticationClient = require('auth0').AuthenticationClient;
const ManagementClient = require('auth0').ManagementClient;
const request = require('request-promise');
const promisify = require('es6-promisify');
const userCacheKeyName = 'auth0_users_by_uuid';
const TWO_HOURS = 60 * 60 * 2;
const helpers = require('./helpers');

// Update user details by user uuid using Management API or Cache.
function updateUserDetails(user_uuid, userData) {
  logger.debug({ user_uuid, userData }, 'Starting updateUserDetails');

  if (!user_uuid) {
    throw new Error('Cant update user details. Supplied user id was undefined!');
  }

  if (!userData || _.isEmpty(userData.user_metadata)) {
    throw new Error('Cant update user details. Supplied user metadata was empty!');
  }

  return getUserDetails(user_uuid)
    .then(user => {
      if (user) {
        return getApiTokenFromAuth0()
          .then(token => { return new ManagementClient({ domain: process.env.AUTH0_DOMAIN, token: token }); })
          .then(auth0Client => {
            logger.debug({ auth0_user_id: user.user_id }, 'Starting auth0.updateUser');
            return auth0Client.updateUser({ id: user.user_id }, userData)
              .then(response => {
                logger.info({ user_uuid: response.app_metadata.dorbel_user_id }, 'Succesfully updated auth0 user details');
                cache.setHashKey(userCacheKeyName, response.app_metadata.dorbel_user_id, JSON.stringify(response));
                analytics.identify(response);
                return response;
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
    }

    return getUserDetailsFromAuth0({
      'app_metadata.dorbel_user_id': user_uuid // Query to get users by app metadata dorbel user id.
    })
    .then(user => {
      if (user) {
        cache.setHashKey(userCacheKeyName, user_uuid, JSON.stringify(user));
        logger.debug({ user_uuid }, 'Got user info from Management API by uuid.');
        return user;
      }

      logger.warn({ user_uuid }, 'Did not get user details from auth0');
    });
  });
}

function getUserDetailsFromAuth0(query) {
  // the query should be in Apache Lucene format https://lucene.apache.org/core/2_9_4/queryparsersyntax.html#AND
  const queryPairs = Object.keys(query).map(key => `${key}:"${query[key]}"`);
  const q = queryPairs.join(' AND ');

  return getApiTokenFromAuth0()
  .then(token => { return new ManagementClient({ domain: process.env.AUTH0_DOMAIN, token }); })
  .then(auth0Client => {
    logger.trace(query, 'Starting auth0.getUsers');
    return auth0Client.getUsers({
      fields: 'user_id,name,email,user_metadata,app_metadata,picture,link,identities,given_name,family_name', // User details field names to get from API.
      q
    });
  })
  .then(user => {
    logger.trace({ query, user }, 'Got user details from auth0.getUsers');
    return user && user[0]; // Removing hierarchy as got only one user.
  });
}

function getApiTokenFromAuth0() {
  logger.debug('Starting getApiTokenFromAuth0');
  if (!process.env.AUTH0_DOMAIN) { throw new Error('You need to define AUTH0_DOMAIN environment variable!'); }
  if (!process.env.AUTH0_API_CLIENT_ID) { throw new Error('You need to define AUTH0_API_CLIENT_ID environment variable!'); }
  if (!process.env.AUTH0_API_CLIENT_SECRET) { throw new Error('You need to define AUTH0_API_CLIENT_SECRET environment variable!'); }
  const cacheKeyName = 'auth0_management_api_token';
  const authDomain = 'https://' + process.env.AUTH0_DOMAIN;
  const options = {
    method: 'POST',
    url: authDomain + '/oauth/token',
    body: {
      'client_id': process.env.AUTH0_API_CLIENT_ID,
      'client_secret': process.env.AUTH0_API_CLIENT_SECRET,
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
            cache.setKey(cacheKeyName, result.access_token, result.expires_in - TWO_HOURS);
            return result.access_token;
          });
      }
    });
}

// Get user details by user token from Auth API or Cache.
function* getProfileFromIdToken(idToken) {
  const ttl = helpers.getTokenTTL(idToken);
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

function getProfileFromAuth0(idToken) {
  if (!process.env.AUTH0_DOMAIN) { throw new Error('You need to define AUTH0_DOMAIN environment variable!'); }
  if (!process.env.AUTH0_FRONT_CLIENT_ID) { throw new Error('You need to define AUTH0_FRONT_CLIENT_ID environment variable!'); }

  // AuthenticationClient is per-user and must be initialized every time
  const client = new AuthenticationClient({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_FRONT_CLIENT_ID
  });

  return promisify(client.tokens.getInfo, client.tokens)(idToken);
}

function getPublicProfile(user_uuid) {
  if (!user_uuid) { throw new Error('Cant get public user profile. Supplied user_uuid was undefined!'); }
  return getUserDetails(user_uuid).then(helpers.normalizePublicProfile);
}

function getPublicProfileByEmail(email) {
  if (!email) { throw new Error('Cant get user details. Supplied email was undefined!'); }
  return getUserDetailsFromAuth0({ email }).then(helpers.normalizePublicProfile);
}

module.exports = {
  updateUserDetails,
  getUserDetails,
  getProfileFromIdToken,
  getPublicProfile,
  getPublicProfileByEmail,
};
