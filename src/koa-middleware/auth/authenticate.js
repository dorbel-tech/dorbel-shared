'use strict';
const _ = require('lodash');

function* authenticate(next) {
  let user;
  const profileHeader = this.request.headers['x-user-profile'];

  try {
    user = profileHeader && JSON.parse(profileHeader);
  } catch (ex) {
    // nothing here
  }

  if (user && user.id) {
    this.request.user = user;
    yield next;
  } else {
    this.response.status = 401;
    this.response.body = 'User is not authorized! Please login again.';
  }
}

module.exports = authenticate;
