const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// ─── Fixed / Specific Routes First ───────────────────────────────────────────
router.get('/my', authenticate, authorize('patient'), invoiceController.getMyInvoices);
router.get('/doctor', authenticate, authorize('doctor'), invoiceController.getDoctorInvoices);
router.get('/stats', authenticate, authorize('admin'), invoiceController.getStats);
router.get('/export.csv', authenticate, authorize('admin'), invoiceController.exportCSV);
router.get('/', authenticate, authorize('admin'), invoiceController.getAll);
router.post('/', authenticate, authorize('admin'), invoiceController.create);

// ─── Parameterized Routes ───────────────────────────────────────────────────
router.get('/:id/pdf', authenticate, invoiceController.downloadPDF);
router.get('/:id', authenticate, invoiceController.getById);
router.put('/:id', authenticate, authorize('admin'), invoiceController.update);
router.post('/:id/payments', authenticate, authorize('admin'), invoiceController.addPayment);
router.put('/:id/cancel', authenticate, authorize('admin'), invoiceController.cancel);

module.exports = router;
