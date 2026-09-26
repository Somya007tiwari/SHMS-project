const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/activity-logs', adminController.getActivityLogs);
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);
router.patch('/users/:id/deactivate', adminController.deactivateUser);
router.patch('/users/:id/activate', adminController.activateUser);

module.exports = router;
