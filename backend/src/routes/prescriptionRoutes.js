const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);
router.get('/my', prescriptionController.getMyPrescriptions);
router.post('/', authorize('doctor'), prescriptionController.create);
router.get('/:id', prescriptionController.getById);
router.get('/:id/download', prescriptionController.downloadPDF);

module.exports = router;
