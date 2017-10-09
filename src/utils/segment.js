'use strict';
const logger = require('../logger').getLogger(module);
const generic = require('./generic');
const key = process.env.SEGMENT_IO_WRITE_KEY;
let analytics;

if (key) {
  const Analytics = require('analytics-node');
  analytics = new Analytics(key);
} else {
  logger.warn('Segment.io will not track as no key was supplied');
  analytics = { track: () => {}, identify: () => {} };
}

function track(userId, eventName, properties) {
  analytics.track({
    userId,
    event: eventName,
    properties
  });
  logger.debug({userId, eventName, properties}, 'tracking event to segment io');
}

function identify(user) {
  analytics.identify(mapAuth0UserToSegmentUser(user));
  logger.debug({user}, 'identifing user to segment io');
}

function mapAuth0UserToSegmentUser(auth0user) {
  const user_metadata = auth0user.user_metadata || {};
  const settings = user_metadata.settings || {}

  return {
    userId: auth0user.app_metadata.dorbel_user_id,
    traits: Object.assign({ // https://segment.com/docs/spec/identify/#traits
      email: user_metadata.email || auth0user.email,
      first_name: user_metadata.first_name || auth0user.given_name,
      last_name: user_metadata.last_name || auth0user.family_name,
      phone: user_metadata.phone,
      avatar: auth0user.picture,
      created_at: auth0user.created_at,
      timezone: 'Asia/Jerusalem',
      environment: process.env.NODE_ENV,
      listing_id: user_metadata.listing_id,
      apartment_id: user_metadata.apartment_id,
      listing_url: user_metadata.apartment_id ? generic.getPropertyUrl(user_metadata.apartment_id) : undefined
    }, settings)
  };
}

module.exports = {
  track,
  identify
};
