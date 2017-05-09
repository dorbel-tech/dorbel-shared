'use strict';
const jwtDecode = require('jwt-decode');
const moment = require('moment');
const _ = require('lodash');

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
    picture: user.picture,
    tenant_profile: _.get(user, 'user_metadata.tenant_profile')
  };

  if (!publicProfile.tenant_profile) {
    publicProfile.tenant_profile = {};
    if (_.get(user, 'identities[0].provider') === 'facebook') {
      publicProfile.tenant_profile.facebook_url = user.link;
    }
  }

  return publicProfile;
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
