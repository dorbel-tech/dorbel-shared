'use strict';
const _ = require('lodash');
const userManagement = require('../../utils/user/management');
const userHeaderKey = 'x-user-profile';

// Take the id-token from the header, fetch the profile, and attach it to the proxied request
function* parseAuthToken(next) {
  // we clear this anyway so it cannot be hijacked
  this.request.headers[userHeaderKey] = undefined;

  const token = getAccessTokenFromHeader(this.request);
  // If no token, continue
  if (!token) {
    return yield next;
  }

  const profile = yield userManagement.getProfileFromIdToken(token);

  if (profile) {
    // Add profile to request headers. This request is proxied to the backend APIS
    // IMPORANT!!! Please make sure not to add here any data here that is not plain ASCII, like user name, etc..
    this.request.headers[userHeaderKey] = JSON.stringify({
      id: profile.dorbel_user_id,
      role: _.get(profile, 'app_metadata.role')
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

module.exports = parseAuthToken;
