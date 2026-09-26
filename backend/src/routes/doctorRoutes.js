const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { upload, uploadToCloud } = require('../middleware/upload');

router.get('/', doctorController.getAll);
router.get('/:id', doctorController.getById);
router.get('/:id/schedule', doctorController.getSchedule);

router.use(authenticate);
router.get('/me/profile', authorize('doctor'), doctorController.getMyProfile);
router.get('/me/dashboard', authorize('doctor'), doctorController.getDashboard);
router.get('/me/patients', authorize('doctor'), doctorController.getPatients);
router.put('/me/schedule', authorize('doctor'), doctorController.updateSchedule);
router.put('/:id', authorize('admin', 'doctor'), upload.single('profileImage'), uploadToCloud('shms/profiles'), doctorController.update);
router.post('/', authorize('admin'), doctorController.create);

module.exports = router;
