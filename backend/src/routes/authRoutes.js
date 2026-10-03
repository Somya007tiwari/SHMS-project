const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginLimiter, sensitiveAuthLimiter, refreshTokenLimiter } = require('../middleware/rateLimiter');
const { upload } = require('../middleware/upload');
const { uploadToCloud } = require('../middleware/upload');

router.post('/register', sensitiveAuthLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/refresh-token', refreshTokenLimiter, authController.refreshToken);
router.post('/forgot-password', sensitiveAuthLimiter, authController.forgotPassword);
router.post('/reset-password', sensitiveAuthLimiter, authController.resetPassword);
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, upload.single('profileImage'), uploadToCloud('shms/profiles'), authController.updateProfile);
router.put('/change-password', authenticate, sensitiveAuthLimiter, authController.changePassword);

module.exports = router;
