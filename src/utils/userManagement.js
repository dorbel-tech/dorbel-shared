// Get user details from auth0 API. 
'user strict';

const config = require('../config');
const logger = require('../logger').getLogger(module);
const ManagementClient = require('auth0').ManagementClient;
const request = require('request-promise');

function getUserDetails(uuid) {
  getApiToken()
    .then(token => {
      return new ManagementClient({
        token: token,
        domain: config.get('AUTH0_DOMAIN')
      });
    })
    .then(auth0 => {
      return auth0
        .getUsers({
          fields: 'name,email,phone', // User details field names to get from API.
          q: 'app_metadata.dorbel_user_id: ' + uuid // Query to get users by app metadata dorbel user id.
        })
        .then(function (user) {
          logger.debug(user);
          return user;
        });
    });
}

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

  return request(options)
    .then(result => {
      logger.debug(result.body, 'API auth response body:');
      return result.body.access_token;
    }).catch(function (err) {
      logger.error(err, 'Failed to get API token');
    });
}

module.exports = {
  getUserDetails
};
