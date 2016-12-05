'use strict';

function* authenticate(next) {
  const user = JSON.parse(this.request.headers['x-user-profile']);
  if (user && user.id) {
    this.request.user = user;
    yield next;
  } else {
    this.response.status = 401;
    this.response.body = 'Not Authorized';
  }
}

module.exports = authenticate;
