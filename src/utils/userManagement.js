'user strict';
// Get user details from auth0 API. 

const shared = require('dorbel-shared');
const config = shared.config;
const logger = shared.logger.getLogger(module);
const ManagementClient = require('auth0').ManagementClient;
const request = require('co-request');

function* getUserDetails(uuid) {
  const token = yield getApiToken();
  const auth0 = new ManagementClient({
    token: token,
    domain: config.get('AUTH0_DOMAIN')
  });

  return auth0
    .getUsers({
      fields: 'name,email,phone', // Use detauks field names to get from API.
      q: 'app_metadata.dorbel_user_id: ' + uuid // Query to get users by app metadata dorbel user id.
    })
    .then(function (user) {
      logger.debug(user);
      return user;
    })
    .catch(function (err) {
      throw new Error(err);
    });
}

function* getApiToken() {
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
  let result = yield request(options); 
  let body = result.body;

  logger.debug('Body: ', body);
  return body.access_token;
}

module.exports = {
  getUserDetails
};
