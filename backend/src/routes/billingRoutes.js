const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);
router.get('/my', authorize('patient'), billingController.getMyBills);
router.get('/revenue-stats', authorize('admin'), billingController.getRevenueStats);
router.get('/', authorize('admin'), billingController.getAll);
router.post('/', authorize('admin'), billingController.create);
router.get('/:id', billingController.getById);
router.post('/:id/payment', authorize('admin'), billingController.addPayment);
router.get('/:id/download', billingController.downloadPDF);

module.exports = router;
