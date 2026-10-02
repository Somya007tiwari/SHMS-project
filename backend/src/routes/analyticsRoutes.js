const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All analytics routes require admin authentication
router.use(authenticate, authorize('admin'));

router.get('/overview', analyticsController.getOverview);
router.get('/appointments-trend', analyticsController.getAppointmentsTrend);
router.get('/revenue-trend', analyticsController.getRevenueTrend);
router.get('/patient-growth', analyticsController.getPatientGrowth);
router.get('/departments', analyticsController.getDepartmentsAnalytics);
router.get('/doctors', analyticsController.getDoctorsAnalytics);
router.get('/export.csv', analyticsController.exportCSV);

module.exports = router;
