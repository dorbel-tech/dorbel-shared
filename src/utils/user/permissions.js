'use strict';
const logger = require('../../logger').getLogger(module);
const errors = require('../domainErrors');

function isUserAdmin(user) {
  return user && user.role === 'admin';
}

function isResourceOwner(user, resourceOwnerId) {
  return user && user.id === resourceOwnerId;
}

function isResourceOwnerOrAdmin(user, resourceOwnerId) {
  return isResourceOwner(user, resourceOwnerId) || isUserAdmin(user);
}

function validateResourceOwnership(user, resourceOwnerId) {
  if (!isResourceOwnerOrAdmin(user, resourceOwnerId)) {
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
