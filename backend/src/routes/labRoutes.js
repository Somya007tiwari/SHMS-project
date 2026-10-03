const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { handleLabUpload } = require('../middleware/labUpload');

// Check table existence middleware for all lab routes
router.use(labController.checkTableExists);

// Protect all routes with authentication
router.use(authenticate);

// ─── CATALOG ROUTES ─────────────────────────────────────────────────────────
router.get('/tests', labController.getTests);
router.get('/tests/:id', labController.getTestById);
router.post('/tests', authorize('admin'), labController.createTest);
router.put('/tests/:id', authorize('admin'), labController.updateTest);
router.patch('/tests/:id/status', authorize('admin'), labController.toggleTestStatus);

// ─── ORDER & BOOKING ROUTES ──────────────────────────────────────────────────
router.post('/orders', authorize('doctor'), labController.createDoctorOrders);
router.post('/orders/book', authorize('patient'), labController.createPatientBooking);
router.post('/orders/:id/cancel', labController.cancelOrder);

// Fixed list routes MUST come before /orders/:id
router.get('/orders/my', authorize('patient'), labController.getMyOrders);
router.get('/orders/doctor', authorize('doctor'), labController.getDoctorOrders);
router.get('/orders', authorize('admin'), labController.getAllOrders);
router.get('/orders/:id', labController.getOrderById);

// ─── STATUS WORKFLOW & RESULTS ──────────────────────────────────────────────
router.patch('/orders/:id/status', authorize('admin'), labController.updateOrderStatus);
router.put('/orders/:id/result', authorize('admin'), labController.submitOrderResult);

// ─── REPORT FILES ────────────────────────────────────────────────────────────
router.post('/orders/:id/files', authorize('admin'), handleLabUpload('files'), labController.uploadReportFiles);
router.get('/files/:fileId/download', labController.downloadReportFile);
router.delete('/files/:fileId', authorize('admin'), labController.deleteReportFile);

// ─── BILLING INTEGRATION ─────────────────────────────────────────────────────
router.post('/orders/:id/add-to-invoice', authorize('admin'), labController.addToInvoice);

module.exports = router;
