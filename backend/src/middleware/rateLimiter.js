const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  statusCode: 429
});

const generalLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_MAX) || 200,
  'Too many requests from this IP, please try again later'
);

const loginLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_LOGIN_MAX) || 10,
  'Too many login attempts from this IP, please try again in 15 minutes'
);

const sensitiveAuthLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 60 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5,
  'Too many requests, please try again in an hour'
);

const refreshTokenLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_REFRESH_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_REFRESH_MAX) || 30,
  'Too many token refresh requests, please try again later'
);

const uploadLimiter = createLimiter(
  60 * 60 * 1000,
  20,
  'Too many file uploads, please try again in 1 hour'
);

const writeLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WRITE_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_WRITE_MAX) || 30,
  'Too many actions, please try again later'
);

// Backward compatibility alias
const authLimiter = loginLimiter;

module.exports = {
  generalLimiter,
  loginLimiter,
  sensitiveAuthLimiter,
  refreshTokenLimiter,
  uploadLimiter,
  writeLimiter,
  authLimiter
};
