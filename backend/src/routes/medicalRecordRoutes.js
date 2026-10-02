const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { handleRecordUpload } = require('../middleware/recordUpload');

// Fixed / specific routes FIRST to prevent shadowing by /:id
router.get('/my', authenticate, medicalRecordController.getMyRecords);
router.get('/patient/:patientId', authenticate, medicalRecordController.getPatientRecords);
router.get('/all', authenticate, authorize('doctor', 'admin'), medicalRecordController.getAllRecords);

router.get('/files/:fileId/download', authenticate, medicalRecordController.downloadFile);
router.delete('/files/:fileId', authenticate, authorize('doctor', 'admin'), medicalRecordController.deleteFile);

// Record CRUD routes
router.get('/:id', authenticate, medicalRecordController.getById);
router.post('/', authenticate, authorize('doctor', 'admin'), medicalRecordController.create);
router.put('/:id', authenticate, authorize('doctor', 'admin'), medicalRecordController.update);
router.delete('/:id', authenticate, authorize('admin'), medicalRecordController.delete);
router.post('/:id/files', authenticate, authorize('doctor', 'admin'), handleRecordUpload('files'), medicalRecordController.uploadFiles);

module.exports = router;
