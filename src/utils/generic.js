'use strict';
const config = require('../config');

// Fix phone number by removing trailing zero and special characters.
function normalizePhone(phone) {
  return phone.replace(/[-+()]/g, ''); 
}

function getListingUrl(listingId) {
  const website_url = config.get('FRONT_GATEWAY_URL') || 'https://app.dorbel.com';
  return website_url + '/apartments/' + listingId;
}

module.exports = {
  getListingUrl,
  normalizePhone
};
