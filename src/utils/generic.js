'use strict';

// Fix phone number by removing trailing zero and special characters.
function normalizePhone(phone) {
  if (phone.startsWith('0')) {
    return phone.substring(1).replace(/[-+()]/g, ''); 
  } else {
    return phone;
  }
}

module.exports = {
  normalizePhone
};
