const { sendError } = require('../utils/responseHandler');

/**
 * Role-Based Access Control middleware
 * @param {...string} allowedRoles - Roles allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Access forbidden: insufficient permissions', 403);
    }

    next();
  };
};

/**
 * Allows access if user is admin OR if accessing their own resource
 */
const authorizeOwnerOrAdmin = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      if (req.user.role === 'admin') {
        return next();
      }

      const resourceUserId = await getResourceUserId(req);
      if (resourceUserId && resourceUserId === req.user.userId) {
        return next();
      }

      return sendError(res, 'Access forbidden', 403);
    } catch (error) {
      return sendError(res, 'Authorization check failed', 500);
    }
  };
};

module.exports = { authorize, authorizeOwnerOrAdmin };
