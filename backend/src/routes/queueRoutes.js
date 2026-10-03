const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Patient check-in & token lookup
router.post('/check-in', authenticate, queueController.checkIn);
router.get('/my-token', authenticate, authorize('patient'), queueController.getMyToken);

// Doctor queue management
router.get('/doctor/today', authenticate, authorize('doctor', 'admin'), queueController.getDoctorTodayQueue);
router.post('/call-next', authenticate, authorize('doctor'), queueController.callNext);
router.post('/token/:tokenId/status', authenticate, authorize('doctor'), queueController.updateTokenStatus);

// Admin live board
router.get('/board', authenticate, authorize('admin'), queueController.getBoard);

module.exports = router;
