'use strict';

async function authenticate(ctx, next) {
  let user;
  const profileHeader = ctx.request.headers['x-user-profile'];

  try {
    user = profileHeader && JSON.parse(profileHeader);
  } catch (ex) {
    // nothing here
  }

  if (user && user.id) {
    ctx.request.user = user;
    await next();
  } else {
    ctx.response.status = 401;
    ctx.response.body = 'User is not authorized! Please login again.';
  }
}

module.exports = authenticate;
