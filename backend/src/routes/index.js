const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/patients', require('./patientRoutes'));
router.use('/doctors', require('./doctorRoutes'));
router.use('/departments', require('./departmentRoutes'));
router.use('/appointments', require('./appointmentRoutes'));
router.use('/prescriptions', require('./prescriptionRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/billing', require('./billingRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/reviews', require('./reviewRoutes'));
router.use('/medical-records', require('./medicalRecordRoutes'));
router.use('/ai', require('./aiRoutes'));
router.use('/assistant', require('./aiRoutes'));
router.use('/invoices', require('./invoiceRoutes'));
router.use('/analytics', require('./analyticsRoutes'));
router.use('/lab', require('./labRoutes'));
router.use('/emergency-card', require('./emergencyCardRoutes'));

module.exports = router;
