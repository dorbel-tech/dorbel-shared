'use strict';
const Analytics = require('analytics-node');
const logger = require('../logger').getLogger(module);
const config = require('../config');

const key = config.get('SEGMENT_IO_WRITE_KEY');
let analytics;

if (key) {
  analytics = new Analytics(key);
} else {
  logger.warn('Segment.io will not track as no key was supplied');
  analytics = { track: () => {}, identify: () => {} };
}

function track(userId, eventName, properties) {
  logger.trace({userId, eventName, properties}, 'tracking event to segment io');
  analytics.track({
    userId,
    event: eventName,
    properties
  });
}

function identify(user) {
  logger.trace({}, 'identifing user to segment io');  
  analytics.identify(mapAuth0UserToSegmentUser(user));
}

function mapAuth0UserToSegmentUser(auth0user) {
  const user_metadata = auth0user.user_metadata || {}; 

  return {
    userId: auth0user.app_metadata.dorbel_user_id,
    traits: { // https://segment.com/docs/spec/identify/#traits
      email: user_metadata.email || auth0user.email,
      firstName: user_metadata.first_name || auth0user.given_name,
      lastName: user_metadata.last_name || auth0user.family_name,
      phone: user_metadata.phone,
      avatar: auth0user.picture,
      createdAt: auth0user.created_at
    }
  };
}

module.exports = {
  track,
  identify
};