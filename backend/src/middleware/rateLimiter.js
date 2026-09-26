const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

const generalLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_MAX) || 100,
  'Too many requests from this IP, please try again later'
);

const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many authentication attempts, please try again in 15 minutes'
);

const uploadLimiter = createLimiter(
  60 * 60 * 1000,
  20,
  'Too many file uploads, please try again in 1 hour'
);

module.exports = { generalLimiter, authLimiter, uploadLimiter };
