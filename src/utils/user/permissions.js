'use strict';
const logger = require('../../logger').getLogger(module);
const errors = require('../domainErrors');

function isUserAdmin(user) {
  return user.role === 'admin';
}

function isResourceOwner(user, resourceOwnerId) {
  return resourceOwnerId == user.id;
}

function isResourceOwnerOrAdmin(user, resourceOwnerId) {
  return isResourceOwner(user, resourceOwnerId) || isUserAdmin(user);
}

function validateResourceOwnership(user, resourceOwnerId) {
  if (!user || !isResourceOwnerOrAdmin(user, resourceOwnerId)) {
    logger.error({
      resource_owner_id: resourceOwnerId,
      user_id: user.id
    }, 'Requesting user is not the resource owner!');
    throw new errors.NotResourceOwnerError();
  }
}

module.exports = {
  isUserAdmin,
  isResourceOwner,
  isResourceOwnerOrAdmin,
  validateResourceOwnership,
};
