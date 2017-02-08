'use strict';

// Fix phone number by removing trailing zero and special characters.
function normalizePhone(phone) {
  return phone.replace(/[-+()]/g, ''); 
}

module.exports = {
  normalizePhone
};
