'use strict';
const _ = require('lodash');
const userHeaderKey = 'x-user-profile';

function* optionalAuthenticate(next) {
  const xUserProfile = this.request.headers[userHeaderKey];
  
  if (xUserProfile) {
    try {
      const user = JSON.parse(xUserProfile);
      if (user && user.id) {
        this.request.user = user;    
      }
    }
    catch(ex) {
      // nothing to do
    }
  }
  
  yield next;
}

module.exports = optionalAuthenticate;
