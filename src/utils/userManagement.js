// Get user details from auth0 API. 
'user strict';

const config = require('../config');
const logger = require('../logger').getLogger(module);
const ManagementClient = require('auth0').ManagementClient;
const request = require('request-promise');

// TODO: Implement user details caching.
function getUserDetails(uuid) {
  return getApiToken()
    .then(token => {
      return new ManagementClient({
        token: token,
        domain: config.get('AUTH0_DOMAIN')
      });
    })
    .then(auth0 => {
      return auth0.getUsers({
        fields: 'name,email,phone', // User details field names to get from API.
        q: 'app_metadata.dorbel_user_id: ' + uuid // Query to get users by app metadata dorbel user id.
      });
    })
    .then(user => {
      logger.debug(user);
      return user;
    });
}

// TODO: Implement token caching and define expiration.
function getApiToken() {
  const authDomain = 'https://' + config.get('AUTH0_DOMAIN');
  const options = {
    method: 'POST',
    url: authDomain + '/oauth/token',
    body: {
      'client_id': config.get('AUTH0_API_CLIENT_ID '),
      'client_secret': config.get('AUTH0_API_CLIENT_SECRET '),
      'audience': authDomain + '/api/v2/',
      'grant_type': 'client_credentials'
    },
    json: true
  };
  logger.debug(options, 'Token post options');

  return request(options)
    .then(result => {
      logger.debug(result.body, 'API auth response body:');
      return result.body.access_token;
    });
}

module.exports = {
  getUserDetails
};
