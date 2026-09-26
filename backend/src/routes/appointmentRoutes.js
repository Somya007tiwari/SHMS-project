const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/slots', appointmentController.getAvailableSlots);
router.get('/my', appointmentController.getMyAppointments);
router.get('/', authorize('admin'), appointmentController.getAll);
router.post('/', authorize('patient'), appointmentController.create);
router.get('/:id', appointmentController.getById);
router.patch('/:id/approve', authorize('doctor', 'admin'), appointmentController.approve);
router.patch('/:id/reject', authorize('doctor', 'admin'), appointmentController.reject);
router.patch('/:id/cancel', appointmentController.cancel);
router.patch('/:id/complete', authorize('doctor', 'admin'), appointmentController.complete);

module.exports = router;
