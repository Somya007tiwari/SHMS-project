const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const emergencyCardController = require('../controllers/emergencyCardController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Strict rate limiter for public emergency card access (20 requests per 15 mins)
const publicCardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many emergency card scan requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429
});

// Public endpoint (no login required)
router.get('/public/:token', publicCardLimiter, emergencyCardController.getPublicCard);

// Patient endpoints (patient role, own data only)
router.get('/me', authenticate, authorize('patient'), emergencyCardController.getMyCard);
router.put('/me', authenticate, authorize('patient'), emergencyCardController.updateMyCard);
router.post('/me/regenerate', authenticate, authorize('patient'), emergencyCardController.regenerateToken);

module.exports = router;
