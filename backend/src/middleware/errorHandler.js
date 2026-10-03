/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Malformed JSON payload handling
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON payload format';
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        statusCode = 409;
        message = 'A record with this information already exists';
        const detail = err.detail || '';
        if (detail.includes('email')) message = 'Email address already registered';
        if (detail.includes('registration_number')) message = 'Registration number already exists';
        break;
      case '23503': // foreign_key_violation
        statusCode = 400;
        message = 'Referenced record does not exist';
        break;
      case '23502': // not_null_violation
        statusCode = 400;
        message = `Required field missing: ${err.column || 'unknown'}`;
        break;
      case '22P02': // invalid_text_representation
        statusCode = 400;
        message = 'Invalid data format';
        break;
      default:
        if (process.env.NODE_ENV === 'development') {
          console.error('Database Error:', err.message);
        }
        if (process.env.NODE_ENV === 'production' && statusCode === 500) {
          message = 'An error occurred processing database query';
        }
    }
  }

  // Multer errors
  const multer = require('multer');
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds allowed limit';
    } else {
      message = err.message || 'File upload error';
    }
  } else if (err.message && (err.message.includes('images are allowed') || err.message.includes('not allowed'))) {
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  // In production, sanitize unexpected 500 errors
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`[${new Date().toISOString()}] Error:`, {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      code: err.code
    })
  });
};

/**
 * Create a custom API error
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };
