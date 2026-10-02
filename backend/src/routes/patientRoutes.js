const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const medicalRecordController = require('../controllers/medicalRecordController');

router.use(authenticate);
router.get('/me/profile', authorize('patient'), patientController.getMyProfile);
router.put('/me/profile', authorize('patient'), patientController.updateProfile);
router.get('/me/health-profile', authorize('patient'), medicalRecordController.getMyHealthProfile);
router.put('/me/health-profile', authorize('patient'), medicalRecordController.updateMyHealthProfile);
router.get('/me/dashboard', authorize('patient'), patientController.getDashboard);
router.get('/me/history', authorize('patient'), patientController.getMedicalHistory);

router.get('/', authorize('admin', 'doctor'), patientController.getAll);
router.get('/:id', authorize('admin', 'doctor'), patientController.getById);
router.get('/:id/health-profile', authorize('admin', 'doctor', 'patient'), medicalRecordController.getPatientHealthProfile);
router.get('/:id/history', authorize('admin', 'doctor'), patientController.getMedicalHistory);
router.patch('/:id/deactivate', authorize('admin'), patientController.deactivate);

module.exports = router;
