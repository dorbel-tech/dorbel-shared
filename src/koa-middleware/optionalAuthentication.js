'use strict';

function* optionalAuthenticate(next) {
  const xUserProfile = this.request.headers['x-user-profile'];
  
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
