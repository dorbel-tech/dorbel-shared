'use strict';

// Fix phone number by removing trailing zero and special characters.
function normalizePhone(phone) {
  return phone.replace(/[-+()]/g, '');
}

function getListingUrl(listingId) {
  const website_url = process.env.FRONT_GATEWAY_URL || 'https://app.dorbel.com';
  return website_url + '/apartments/' + listingId;
}

function getPropertyUrl(apartmentId) {
  const website_url = process.env.FRONT_GATEWAY_URL || 'https://app.dorbel.com';
  return website_url + '/properties/' + apartmentId;
}

function normalizeSlug(slug, lowercase = false) {
  let normailzed;

  if(slug){
    normailzed = encodeURIComponent(slug.replace('\'', '').replace('%27', ''));
    normailzed = lowercase ? normailzed.toLowerCase() : normailzed;
  }

  return normailzed;
}

module.exports = {
  getListingUrl,
  getPropertyUrl,
  normalizePhone,
  normalizeSlug
};
