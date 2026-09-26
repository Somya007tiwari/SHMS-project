const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { sendError } = require('../utils/responseHandler');

/**
 * Verify JWT access token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Access token required', 401);
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, jwtConfig.access.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Access token expired', 401, 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid access token', 401, 'TOKEN_INVALID');
    }
    return sendError(res, 'Authentication failed', 401);
  }
};

/**
 * Optional authentication - attaches user if token present
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, jwtConfig.access.secret);
      req.user = decoded;
    }
    next();
  } catch {
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate };
