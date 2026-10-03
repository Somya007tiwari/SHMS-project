const express = require('express');
const router = express.Router();

const resolveActingPatient = require('../middleware/actingAs');

router.use('/auth', require('./authRoutes'));

// Apply resolveActingPatient middleware to resolve dependent context when X-Acting-Patient-Id header is sent
router.use(resolveActingPatient);

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
router.use('/queue', require('./queueRoutes'));
router.use('/family', require('./familyRoutes'));

module.exports = router;
