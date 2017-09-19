'use strict';
const jwtDecode = require('jwt-decode');
const moment = require('moment');
const _ = require('lodash');

// Make sure to sync this object in case of changing with front-gateway client object as well:
// https://github.com/dorbel-tech/dorbel-app/blob/master/front-gateway/src/providers/auth/auth0helper.js
function normalizePublicProfile(auth0profile) {
  if (!auth0profile) {
    return;
  }

  const mappedProfile = {
    dorbel_user_id: _.get(auth0profile, 'app_metadata.dorbel_user_id'),
    auth0_user_id: _.get(auth0profile, 'sub'),
    email: _.get(auth0profile, 'user_metadata.email') || auth0profile.email,
    first_name: _.get(auth0profile, 'user_metadata.first_name') || auth0profile.given_name,
    last_name: _.get(auth0profile, 'user_metadata.last_name') || auth0profile.family_name,
    phone: _.get(auth0profile, 'user_metadata.phone'),
    picture: getPermanentFBPictureUrl(auth0profile) || auth0profile.picture,
    tenant_profile: _.get(auth0profile, 'user_metadata.tenant_profile') || {},
    settings: _.get(auth0profile, 'user_metadata.settings') || {},
    role: _.get(auth0profile, 'app_metadata.role'),
    first_login: _.get(auth0profile, 'app_metadata.first_login'),
    allow_publisher_messages: _.get(auth0profile, 'user_metadata.settings.allow_publisher_messages', true)
  };

  const linkedinIdentity = _.find(auth0profile.identities || [], { provider: 'linkedin' });
  if (linkedinIdentity) {
    const linkedInWorkPlace = 'positions.values[0].company.name';
    const linkedInWorkPosition = 'positions.values[0].title';
    mappedProfile.tenant_profile.linkedin_url = mappedProfile.tenant_profile.linkedin_url || _.get(auth0profile, 'publicProfileUrl') || _.get(linkedinIdentity.profileData, 'publicProfileUrl');
    mappedProfile.tenant_profile.work_place = mappedProfile.tenant_profile.work_place || _.get(auth0profile, linkedInWorkPlace) || _.get(linkedinIdentity.profileData, linkedInWorkPlace);
    mappedProfile.tenant_profile.position = mappedProfile.tenant_profile.position || _.get(auth0profile, linkedInWorkPosition) || _.get(linkedinIdentity.profileData, linkedInWorkPosition);
  }

  const facebookIdentity = _.find(auth0profile.identities || [], { provider: 'facebook' });
  if (facebookIdentity) {
    const facebookWorkPlace = 'work[0].employer.name';
    const facebookWorkPosition = 'work[0].position.name';
    mappedProfile.tenant_profile.facebook_user_id = facebookIdentity.user_id;
    mappedProfile.tenant_profile.facebook_url = 'https://www.facebook.com/app_scoped_user_id/' + facebookIdentity.user_id;
    mappedProfile.tenant_profile.work_place = mappedProfile.tenant_profile.work_place || _.get(auth0profile, facebookWorkPlace) || _.get(facebookIdentity.profileData, facebookWorkPlace);
    mappedProfile.tenant_profile.position = mappedProfile.tenant_profile.position || _.get(auth0profile, facebookWorkPosition) || _.get(facebookIdentity.profileData, facebookWorkPosition);
  }

  return mappedProfile;
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
