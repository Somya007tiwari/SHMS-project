const { sendError } = require('../utils/responseHandler');

/**
 * Zod schema validation middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      req.body = parsed.body || req.body;
      req.query = parsed.query || req.query;
      req.params = parsed.params || req.params;
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const errors = error.errors.map(e => ({
          field: e.path.slice(1).join('.'),
          message: e.message
        }));
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      return sendError(res, 'Validation error', 400);
    }
  };
};

module.exports = { validate };
