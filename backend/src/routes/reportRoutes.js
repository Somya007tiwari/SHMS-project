const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { upload, uploadToCloud } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);
router.get('/my', reportController.getMyReports);
router.get('/:id', reportController.getById);
router.post('/', uploadLimiter, upload.single('file'), uploadToCloud('shms/reports'), reportController.upload);
router.delete('/:id', reportController.delete);

module.exports = router;
