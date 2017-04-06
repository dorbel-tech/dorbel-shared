'use strict';

function setPublicCacheHeader(response, MAX_AGE) {
  response.set('Cache-Control', 'max-age=' + MAX_AGE);
}

function setPrivateCacheHeader(request, response, MAX_AGE) {
  if (!request.user) {
    setPublicCacheHeader(response, MAX_AGE);
  } else {
    response.set('Cache-Control', 'no-cache');
  }  
}

module.exports = {
  setPublicCacheHeader,
  setPrivateCacheHeader
};
