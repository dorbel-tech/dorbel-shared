'use strict';

function setCacheHeader(response, MAX_AGE) {
  response.set('Cache-Control', 'max-age=' + MAX_AGE);
}

function setNoCacheHeader(response) {
  response.set('Cache-Control', 'no-cache');
}

function setUserConditionalCacheHeader(request, response, MAX_AGE) {
  if (!request.user) {
    setCacheHeader(response, MAX_AGE);
  } else {
    setNoCacheHeader(response);
  }  
}

module.exports = {
  setCacheHeader,
  setNoCacheHeader,
  setUserConditionalCacheHeader
};
