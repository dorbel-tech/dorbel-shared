'use strict';
const jwtDecode = require('jwt-decode');
const moment = require('moment');
const _ = require('lodash');

// Make sure to sync this object in case of changing with front-gateway client object as well:
// https://github.com/dorbel-tech/dorbel-app/blob/master/front-gateway/src/providers/auth/auth0helper.js
function normalizePublicProfile(user) {
  if (!user) {
    return;
  }

  const publicProfile = {
    dorbel_user_id: _.get(user, 'app_metadata.dorbel_user_id'),
    email: _.get(user, 'user_metadata.email') || user.email,
    first_name: _.get(user, 'user_metadata.first_name') || user.given_name,
    last_name: _.get(user, 'user_metadata.last_name') || user.family_name,
    phone: _.get(user, 'user_metadata.phone'),
    picture: getPermanentFBPictureUrl(user) || user.picture,
    tenant_profile: _.get(user, 'user_metadata.tenant_profile'),
    allow_publisher_messages: _.get(user, 'user_metadata.settings.allow_publisher_messages', true)
  };

  if (!publicProfile.tenant_profile) {
    publicProfile.tenant_profile = {};
    const facebookIdentity = _.find(user.identities, { provider: 'facebook' });
    if (facebookIdentity) {
      publicProfile.tenant_profile.facebook_user_id = facebookIdentity.user_id;
      publicProfile.tenant_profile.facebook_url = 'https://www.facebook.com/app_scoped_user_id/' + facebookIdentity.user_id;
    }
    publicProfile.tenant_profile.work_place = _.get(user, 'work[0].employer.name');
    publicProfile.tenant_profile.position = _.get(user, 'work[0].position.name');
  }

  return publicProfile;
}

// Created because Auth0 FB images expire after a period of time
function getPermanentFBPictureUrl(user) {
  const facebookData = _.find(user.identities, (identity) => identity.provider === 'facebook');
  return facebookData ? `http://graph.facebook.com/${facebookData.user_id}/picture?type=large` : undefined;
}

function getTokenTTL(token) {
  let exp = jwtDecode(token).exp; // Token expiration seconds in unix.
  let now = moment().unix(); // Now seconds in unix.
  return exp - now; // Time to live in cache in seconds.
}

module.exports = {
  normalizePublicProfile,
  getTokenTTL
};
