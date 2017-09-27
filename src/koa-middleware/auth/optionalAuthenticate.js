'use strict';

async function optionalAuthenticate(ctx, next) {
  const xUserProfile = ctx.request.headers['x-user-profile'];
  
  if (xUserProfile) {
    try {
      const user = JSON.parse(xUserProfile);
      if (user && user.id) {
        ctx.request.user = user;    
      }
    }
    catch(ex) {
      // nothing to do
    }
  }
  
  await next();
}

module.exports = optionalAuthenticate;
