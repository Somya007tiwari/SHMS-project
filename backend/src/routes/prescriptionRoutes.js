const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Fixed / specific routes FIRST to avoid shadowing by /:id
router.get('/my', authenticate, authorize('patient'), prescriptionController.getMyPrescriptions);
router.get('/doctor', authenticate, authorize('doctor'), prescriptionController.getDoctorPrescriptions);
router.get('/medicine-suggestions', authenticate, authorize('doctor', 'admin'), prescriptionController.getMedicineSuggestions);

router.get('/:id/pdf', authenticate, prescriptionController.downloadPDF);
router.get('/:id', authenticate, prescriptionController.getById);

router.get('/', authenticate, authorize('admin'), prescriptionController.getAllPrescriptions);
router.post('/', authenticate, authorize('doctor'), prescriptionController.create);
router.put('/:id', authenticate, authorize('doctor'), prescriptionController.update);

module.exports = router;
