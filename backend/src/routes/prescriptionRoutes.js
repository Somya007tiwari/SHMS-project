const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createPrescriptionSchema } = require('../validators');

const { sensitiveAuthLimiter } = require('../middleware/rateLimiter');

// Public verification and share routes (no auth required, rate limited)
router.get('/verify/:code', sensitiveAuthLimiter, prescriptionController.verifyCode);
router.get('/shared/:token/pdf', sensitiveAuthLimiter, prescriptionController.downloadSharedPDF);
router.get('/shared/:token', sensitiveAuthLimiter, prescriptionController.getSharedPrescription);

// Fixed / specific routes FIRST to avoid shadowing by /:id
router.get('/my', authenticate, authorize('patient'), prescriptionController.getMyPrescriptions);
router.get('/doctor', authenticate, authorize('doctor'), prescriptionController.getDoctorPrescriptions);
router.get('/medicine-suggestions', authenticate, authorize('doctor', 'admin'), prescriptionController.getMedicineSuggestions);

// Patient share link management
router.post('/:id/share', authenticate, authorize('patient'), prescriptionController.createShare);
router.get('/:id/shares', authenticate, authorize('patient'), prescriptionController.getShares);
router.delete('/shares/:shareId', authenticate, authorize('patient'), prescriptionController.revokeShare);

// Base collection routes
router.get('/', authenticate, authorize('admin'), prescriptionController.getAllPrescriptions);
router.post('/', authenticate, authorize('doctor'), validate(createPrescriptionSchema), prescriptionController.create);

// Parameterized item routes
router.get('/:id/pdf', authenticate, prescriptionController.downloadPDF);
router.get('/:id', authenticate, prescriptionController.getById);
router.put('/:id', authenticate, authorize('doctor'), prescriptionController.update);

module.exports = router;
