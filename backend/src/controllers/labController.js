const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const LabTest = require('../models/LabTest');
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { pool } = require('../config/database');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const notificationService = require('../services/notificationService');

const LAB_DIR = path.join(__dirname, '../../uploads/lab');
if (!fs.existsSync(LAB_DIR)) {
  fs.mkdirSync(LAB_DIR, { recursive: true });
}

// Valid status transitions map
const VALID_TRANSITIONS = {
  requested: ['scheduled', 'sample_collected', 'processing', 'completed', 'cancelled'],
  scheduled: ['sample_collected', 'processing', 'completed', 'cancelled'],
  sample_collected: ['processing', 'completed', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [], // Completed cannot transition
  cancelled: []  // Cancelled cannot transition
};

const labController = {
  /**
   * Middleware to check table existence safely
   */
  async checkTableExists(req, res, next) {
    const exists = await LabTest.checkTableExists();
    if (!exists) {
      return sendError(res, 'Lab tables are missing. Please run the Phase 7 migration.', 503);
    }
    next();
  },

  // ─── LAB CATALOG ENDPOINTS ──────────────────────────────────────────────────

  /**
   * GET /api/lab/tests - List catalog tests
   */
  async getTests(req, res) {
    const { page, limit } = getPagination(req.query);
    const { search, category, activeOnly } = req.query;

    const isAdmin = req.user?.role === 'admin';
    const filterActive = isAdmin ? (activeOnly === 'true') : true;

    const data = await LabTest.getAll({
      page,
      limit,
      search,
      category,
      activeOnly: filterActive
    });

    return sendPaginated(res, data.tests, buildPaginationMeta(data.total, page, limit));
  },

  /**
   * GET /api/lab/tests/:id - Get single catalog test
   */
  async getTestById(req, res) {
    const { id } = req.params;
    const test = await LabTest.findById(id);
    if (!test) return sendError(res, 'Lab test not found', 404);
    return sendSuccess(res, test);
  },

  /**
   * POST /api/lab/tests - Admin create test
   */
  async createTest(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Only administrators can add lab tests', 403);
    }

    const {
      name,
      code,
      category,
      description,
      price,
      sampleType,
      preparationInstructions,
      turnaroundHours,
      unit,
      normalMin,
      normalMax,
      normalText
    } = req.body;

    if (!name || !name.trim()) return sendError(res, 'Test name is required', 400);
    if (!category || !category.trim()) return sendError(res, 'Test category is required', 400);

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return sendError(res, 'Price must be a valid non-negative number', 400);
    }

    // Validate normal ranges if both provided
    const minVal = (normalMin !== undefined && normalMin !== '' && normalMin !== null) ? parseFloat(normalMin) : null;
    const maxVal = (normalMax !== undefined && normalMax !== '' && normalMax !== null) ? parseFloat(normalMax) : null;

    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      return sendError(res, 'Normal minimum value cannot be greater than maximum value', 400);
    }

    // Check case-insensitive unique name
    const existingName = await LabTest.findByName(name.trim());
    if (existingName) {
      return sendError(res, `A lab test with name "${name.trim()}" already exists`, 409);
    }

    if (code && code.trim()) {
      const existingCode = await LabTest.findByCode(code.trim());
      if (existingCode) {
        return sendError(res, `A lab test with code "${code.trim()}" already exists`, 409);
      }
    }

    const newTest = await LabTest.create({
      name: name.trim(),
      code: code ? code.trim() : null,
      category: category.trim(),
      description,
      price: numericPrice,
      sampleType,
      preparationInstructions,
      turnaroundHours: turnaroundHours ? parseInt(turnaroundHours, 10) : null,
      unit,
      normalMin: minVal,
      normalMax: maxVal,
      normalText
    });

    return sendCreated(res, newTest, 'Lab test added to catalog successfully');
  },

  /**
   * PUT /api/lab/tests/:id - Admin update test
   */
  async updateTest(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Only administrators can update lab tests', 403);
    }

    const { id } = req.params;
    const test = await LabTest.findById(id);
    if (!test) return sendError(res, 'Lab test not found', 404);

    const {
      name,
      code,
      category,
      description,
      price,
      sampleType,
      preparationInstructions,
      turnaroundHours,
      unit,
      normalMin,
      normalMax,
      normalText,
      isActive
    } = req.body;

    if (name && name.trim()) {
      const existingName = await LabTest.findByName(name.trim());
      if (existingName && existingName.id !== id) {
        return sendError(res, `A lab test with name "${name.trim()}" already exists`, 409);
      }
    }

    if (code && code.trim()) {
      const existingCode = await LabTest.findByCode(code.trim());
      if (existingCode && existingCode.id !== id) {
        return sendError(res, `A lab test with code "${code.trim()}" already exists`, 409);
      }
    }

    const numericPrice = price !== undefined ? parseFloat(price) : test.price;
    if (isNaN(numericPrice) || numericPrice < 0) {
      return sendError(res, 'Price must be a valid non-negative number', 400);
    }

    const minVal = (normalMin !== undefined && normalMin !== '' && normalMin !== null) ? parseFloat(normalMin) : null;
    const maxVal = (normalMax !== undefined && normalMax !== '' && normalMax !== null) ? parseFloat(normalMax) : null;

    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      return sendError(res, 'Normal minimum value cannot be greater than maximum value', 400);
    }

    const updated = await LabTest.update(id, {
      name: name ? name.trim() : test.name,
      code: code !== undefined ? (code ? code.trim() : null) : test.code,
      category: category ? category.trim() : test.category,
      description: description !== undefined ? description : test.description,
      price: numericPrice,
      sampleType: sampleType !== undefined ? sampleType : test.sample_type,
      preparationInstructions: preparationInstructions !== undefined ? preparationInstructions : test.preparation_instructions,
      turnaroundHours: turnaroundHours !== undefined ? (turnaroundHours ? parseInt(turnaroundHours, 10) : null) : test.turnaround_hours,
      unit: unit !== undefined ? unit : test.unit,
      normalMin: minVal,
      normalMax: maxVal,
      normalText: normalText !== undefined ? normalText : test.normal_text,
      isActive: isActive !== undefined ? Boolean(isActive) : test.is_active
    });

    return sendSuccess(res, updated, 'Lab test updated successfully');
  },

  /**
   * PATCH /api/lab/tests/:id/status - Toggle active/deactive
   */
  async toggleTestStatus(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Only administrators can update lab test status', 403);
    }

    const { id } = req.params;
    const test = await LabTest.findById(id);
    if (!test) return sendError(res, 'Lab test not found', 404);

    const updated = await LabTest.update(id, { isActive: !test.is_active });
    return sendSuccess(res, updated, `Lab test ${updated.is_active ? 'activated' : 'deactivated'} successfully`);
  },

  // ─── ORDERING & BOOKING ENDPOINTS ──────────────────────────────────────────

  /**
   * POST /api/lab/orders - Doctor orders tests for patient
   */
  async createDoctorOrders(req, res) {
    if (req.user.role !== 'doctor') {
      return sendError(res, 'Only doctors can place lab test orders', 403);
    }

    const { patientId, testIds, appointmentId, notes } = req.body;

    if (!patientId) return sendError(res, 'Patient ID is required', 400);
    if (!Array.isArray(testIds) || testIds.length === 0) {
      return sendError(res, 'At least one lab test must be selected', 400);
    }
    if (testIds.length > 10) {
      return sendError(res, 'Maximum 10 lab tests can be ordered per request', 400);
    }

    const patient = await Patient.findById(patientId);
    if (!patient) return sendError(res, 'Patient not found', 404);

    // Verify appointment relationship
    if (appointmentId) {
      const appt = await Appointment.findById(appointmentId);
      if (!appt || appt.patient_id !== patientId || appt.doctor_id !== req.user.doctorId) {
        return sendError(res, 'Invalid appointment associated with patient and doctor', 400);
      }
      if (['cancelled', 'rejected'].includes(appt.status)) {
        return sendError(res, 'Cannot order tests for a cancelled or rejected appointment', 400);
      }
    } else {
      // Doctor must have at least one non-cancelled appointment with patient
      const apptCheck = await pool.query(
        `SELECT 1 FROM appointments 
         WHERE doctor_id = $1 AND patient_id = $2 AND status NOT IN ('cancelled', 'rejected') 
         LIMIT 1`,
        [req.user.doctorId, patientId]
      );
      if (apptCheck.rows.length === 0) {
        return sendError(res, 'You can only order tests for patients with an active or past valid appointment.', 403);
      }
    }

    // Verify tests exist and are active
    for (const tId of testIds) {
      const t = await LabTest.findById(tId);
      if (!t || !t.is_active) {
        return sendError(res, 'One or more selected lab tests are invalid or inactive', 400);
      }
    }

    const createdOrders = await LabOrder.createDoctorOrders({
      patientId,
      doctorId: req.user.doctorId,
      appointmentId,
      testIds,
      notes
    });

    // Notify Patient safely
    if (patient.user_id) {
      try {
        const doctor = await Doctor.findById(req.user.doctorId);
        notificationService.notify(patient.user_id, {
          type: 'system',
          title: 'Lab Test Ordered 🔬',
          message: `Dr. ${doctor?.first_name || 'Doctor'} ordered ${createdOrders.length} lab test(s) for you.`,
          link: '/patient/lab-tests',
          data: { orderCount: createdOrders.length }
        }).catch(err => console.error('Notification warning:', err.message));
      } catch (err) {
        // Safe fallback
      }
    }

    return sendCreated(res, createdOrders, `Successfully ordered ${createdOrders.length} lab test(s)`);
  },

  /**
   * POST /api/lab/orders/book - Patient self-books tests
   */
  async createPatientBooking(req, res) {
    if (req.user.role !== 'patient') {
      return sendError(res, 'Only patients can book lab test appointments', 403);
    }

    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    const { testIds, scheduledDate, scheduledTime, notes } = req.body;

    if (!Array.isArray(testIds) || testIds.length === 0) {
      return sendError(res, 'At least one lab test must be selected', 400);
    }
    if (testIds.length > 10) {
      return sendError(res, 'Maximum 10 lab tests can be booked per request', 400);
    }
    if (!scheduledDate) return sendError(res, 'Scheduled date is required', 400);
    if (!scheduledTime) return sendError(res, 'Scheduled time is required', 400);

    // Validate date: today <= date <= 60 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(scheduledDate);
    targetDate.setHours(0, 0, 0, 0);

    if (isNaN(targetDate.getTime()) || targetDate < today) {
      return sendError(res, 'Scheduled date must be today or a future date', 400);
    }

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 60);
    if (targetDate > maxDate) {
      return sendError(res, 'Scheduled date cannot be more than 60 days in advance', 400);
    }

    // Validate working hours (07:00 to 19:00)
    const hour = parseInt(scheduledTime.split(':')[0], 10);
    if (isNaN(hour) || hour < 7 || hour > 19) {
      return sendError(res, 'Scheduled time must be within working hours (07:00 to 19:00)', 400);
    }

    // Verify active tests
    for (const tId of testIds) {
      const t = await LabTest.findById(tId);
      if (!t || !t.is_active) {
        return sendError(res, 'One or more selected lab tests are invalid or inactive', 400);
      }
    }

    const createdOrders = await LabOrder.createPatientBooking({
      patientId: patient.id,
      testIds,
      scheduledDate,
      scheduledTime,
      notes
    });

    return sendCreated(res, createdOrders, `Successfully booked ${createdOrders.length} lab test(s)`);
  },

  /**
   * POST /api/lab/orders/:id/cancel - Cancel lab order
   */
  async cancelOrder(req, res) {
    const { id } = req.params;
    const order = await LabOrder.findById(id);
    if (!order) return sendError(res, 'Lab order not found', 404);

    if (order.status === 'completed') {
      return sendError(res, 'Completed lab orders cannot be cancelled', 400);
    }
    if (order.status === 'cancelled') {
      return sendError(res, 'Lab order is already cancelled', 400);
    }

    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient || patient.id !== order.patient_id) {
        return sendError(res, 'Lab order not found', 404);
      }
      if (!['requested', 'scheduled'].includes(order.status)) {
        return sendError(res, 'Patients can only cancel orders while in requested or scheduled status', 400);
      }
    } else if (req.user.role !== 'admin') {
      return sendError(res, 'Access denied', 403);
    }

    const updated = await LabOrder.updateStatus(id, 'cancelled');
    return sendSuccess(res, updated, 'Lab order cancelled successfully');
  },

  // ─── LIST & DETAIL ENDPOINTS ────────────────────────────────────────────────

  /**
   * GET /api/lab/orders/my - Patient own lab orders
   */
  async getMyOrders(req, res) {
    if (req.user.role !== 'patient') {
      return sendError(res, 'Unauthorized', 403);
    }
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    const { page, limit } = getPagination(req.query);
    const { status, category } = req.query;

    const data = await LabOrder.getByPatientId(patient.id, { page, limit, status, category });
    return sendPaginated(res, data.orders, buildPaginationMeta(data.total, page, limit));
  },

  /**
   * GET /api/lab/orders/doctor - Orders placed by doctor
   */
  async getDoctorOrders(req, res) {
    if (req.user.role !== 'doctor') {
      return sendError(res, 'Unauthorized', 403);
    }
    const { page, limit } = getPagination(req.query);
    const { status, search } = req.query;

    const data = await LabOrder.getByDoctorId(req.user.doctorId, { page, limit, status, search });
    return sendPaginated(res, data.orders, buildPaginationMeta(data.total, page, limit));
  },

  /**
   * GET /api/lab/orders - Admin all orders
   */
  async getAllOrders(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Unauthorized', 403);
    }
    const { page, limit } = getPagination(req.query);
    const { status, search, fromDate, toDate } = req.query;

    const data = await LabOrder.getAll({ page, limit, status, search, fromDate, toDate });
    return sendPaginated(res, data.orders, buildPaginationMeta(data.total, page, limit));
  },

  /**
   * GET /api/lab/orders/:id - Order detail with access check
   */
  async getOrderById(req, res) {
    const { id } = req.params;
    const order = await LabOrder.findById(id);
    if (!order) return sendError(res, 'Lab order not found', 404);

    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient || patient.id !== order.patient_id) {
        return sendError(res, 'Lab order not found', 404);
      }
    } else if (req.user.role === 'doctor') {
      if (order.ordered_by_doctor_id !== req.user.doctorId) {
        // Check if doctor has active/past appointment with patient
        const hasRelation = await pool.query(
          `SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2 LIMIT 1`,
          [req.user.doctorId, order.patient_id]
        );
        if (hasRelation.rows.length === 0) {
          return sendError(res, 'Lab order not found', 404);
        }
      }
    }

    const files = await LabOrder.getFilesByOrderId(id);
    return sendSuccess(res, { ...order, files });
  },

  // ─── STATUS WORKFLOW & RESULTS ──────────────────────────────────────────────

  /**
   * PATCH /api/lab/orders/:id/status - Admin update status
   */
  async updateOrderStatus(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Only administrators can update lab order status', 403);
    }

    const { id } = req.params;
    const { status } = req.body;

    const order = await LabOrder.findById(id);
    if (!order) return sendError(res, 'Lab order not found', 404);

    const allowedNext = VALID_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(status)) {
      return sendError(
        res,
        `Invalid status transition from "${order.status}" to "${status}". Allowed transitions: ${allowedNext.join(', ') || 'None'}`,
        400
      );
    }

    const updated = await LabOrder.updateStatus(id, status);
    return sendSuccess(res, updated, `Lab order status updated to ${status}`);
  },

  /**
   * PUT /api/lab/orders/:id/result - Admin submit or edit result
   */
  async submitOrderResult(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Only administrators can enter lab test results', 403);
    }

    const { id } = req.params;
    const { resultValue, resultNotes, manualFlag } = req.body;

    const order = await LabOrder.findById(id);
    if (!order) return sendError(res, 'Lab order not found', 404);

    if (order.status === 'cancelled') {
      return sendError(res, 'Cannot submit results for a cancelled order', 400);
    }

    if (!resultValue || !String(resultValue).trim()) {
      return sendError(res, 'Result value is required', 400);
    }

    const cleanVal = String(resultValue).trim();
    let numVal = parseFloat(cleanVal);
    let flag = 'unknown';

    const min = order.normal_min !== null ? parseFloat(order.normal_min) : null;
    const max = order.normal_max !== null ? parseFloat(order.normal_max) : null;

    if (!isNaN(numVal) && (min !== null || max !== null)) {
      // Server-side calculated numeric flag (Never trust client for numeric tests)
      if (min !== null && numVal < min) {
        flag = 'low';
      } else if (max !== null && numVal > max) {
        flag = 'high';
      } else {
        flag = 'normal';
      }
    } else {
      // Non-numeric or text reference test: use manual flag if provided, else normal/abnormal
      const validFlags = ['normal', 'low', 'high', 'abnormal', 'unknown'];
      if (manualFlag && validFlags.includes(manualFlag)) {
        flag = manualFlag;
      } else {
        flag = 'normal';
      }
    }

    const updated = await LabOrder.updateResult(id, {
      resultValue: cleanVal,
      resultNumeric: !isNaN(numVal) ? numVal : null,
      resultFlag: flag,
      resultNotes,
      resultedBy: req.user.userId
    });

    // Notify Doctor & Patient safely
    try {
      if (order.patient_user_id) {
        notificationService.notify(order.patient_user_id, {
          type: 'system',
          title: 'Lab Results Ready 🧪',
          message: `Your lab test results for ${order.test_name} are ready.`,
          link: '/patient/lab-tests',
          data: { orderId: id }
        }).catch(err => console.error('Notification warning:', err.message));
      }

      if (order.ordered_by_doctor_id) {
        const doc = await Doctor.findById(order.ordered_by_doctor_id);
        if (doc && doc.user_id) {
          notificationService.notify(doc.user_id, {
            type: 'system',
            title: `Lab Results Completed: ${order.patient_name}`,
            message: `Lab test results for ${order.test_name} (${order.patient_name}) are completed. Flag: ${flag.toUpperCase()}`,
            link: '/doctor/lab-orders',
            data: { orderId: id, flag }
          }).catch(err => console.error('Notification warning:', err.message));
        }
      }
    } catch (err) {
      // Safe fallback
    }

    return sendSuccess(res, updated, 'Lab result saved and completed successfully');
  },

  // ─── REPORT FILE UPLOAD & DOWNLOAD ──────────────────────────────────────────

  /**
   * POST /api/lab/orders/:id/files - Upload PDF/Images report (Admin)
   */
  async uploadReportFiles(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Only administrators can upload lab report files', 403);
    }

    const { id } = req.params;
    const order = await LabOrder.findById(id);
    if (!order) return sendError(res, 'Lab order not found', 404);

    const existingFiles = await LabOrder.getFilesByOrderId(id);
    if (existingFiles.length + req.files.length > 3) {
      return sendError(res, `Maximum 3 report files allowed per lab order (currently has ${existingFiles.length}).`, 400);
    }

    const savedFiles = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname) || '.pdf';
      const storedName = `${uuidv4()}${ext}`;
      const targetPath = path.join(LAB_DIR, storedName);

      fs.writeFileSync(targetPath, file.buffer);

      const fileRow = await LabOrder.addFile({
        orderId: id,
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy: req.user.userId
      });

      savedFiles.push(fileRow);
    }

    const allFiles = await LabOrder.getFilesByOrderId(id);
    return sendSuccess(res, allFiles, 'Report file(s) uploaded successfully');
  },

  /**
   * GET /api/lab/files/:fileId/download - Stream private report file
   */
  async downloadReportFile(req, res) {
    const { fileId } = req.params;
    const file = await LabOrder.getFileById(fileId);
    if (!file) return sendError(res, 'File not found', 404);

    const order = await LabOrder.findById(file.order_id);
    if (!order) return sendError(res, 'Lab order not found', 404);

    // Access control
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient || patient.id !== order.patient_id) {
        return sendError(res, 'File not found', 404);
      }
    } else if (req.user.role === 'doctor') {
      if (order.ordered_by_doctor_id !== req.user.doctorId) {
        const hasRelation = await pool.query(
          `SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2 LIMIT 1`,
          [req.user.doctorId, order.patient_id]
        );
        if (hasRelation.rows.length === 0) {
          return sendError(res, 'File not found', 404);
        }
      }
    }

    const filePath = path.join(LAB_DIR, file.stored_name);
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'File asset not found on server', 404);
    }

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  },

  /**
   * DELETE /api/lab/files/:fileId - Delete file (Admin)
   */
  async deleteReportFile(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Only administrators can delete lab report files', 403);
    }

    const { fileId } = req.params;
    const file = await LabOrder.getFileById(fileId);
    if (!file) return sendError(res, 'File not found', 404);

    try {
      const filePath = path.join(LAB_DIR, file.stored_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete disk asset ${file.stored_name}:`, err.message);
    }

    await LabOrder.deleteFile(fileId);
    return sendSuccess(res, null, 'Report file deleted successfully');
  },

  // ─── BILLING INTEGRATION HOOK ──────────────────────────────────────────────

  /**
   * POST /api/lab/orders/:id/add-to-invoice - Add lab test to patient invoice
   */
  async addToInvoice(req, res) {
    if (req.user.role !== 'admin') {
      return sendError(res, 'Only administrators can add lab orders to invoice', 403);
    }

    const { id } = req.params;
    const order = await LabOrder.findById(id);
    if (!order) return sendError(res, 'Lab order not found', 404);

    if (order.invoice_item_id) {
      return sendError(res, 'This lab order has already been added to an invoice', 409);
    }

    // Check if invoices & invoice_items tables exist
    const checkInvoiceTable = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices')`
    );
    if (!checkInvoiceTable.rows[0]?.exists) {
      return sendError(res, 'Billing tables are missing. Please run the Phase 8 migration.', 400);
    }

    try {
      // Find or create pending invoice for patient
      let invoiceRes;
      if (order.appointment_id) {
        invoiceRes = await pool.query(
          `SELECT * FROM invoices WHERE appointment_id = $1 AND status = 'pending' LIMIT 1`,
          [order.appointment_id]
        );
      }

      if (!invoiceRes || invoiceRes.rows.length === 0) {
        invoiceRes = await pool.query(
          `SELECT * FROM invoices WHERE patient_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
          [order.patient_id]
        );
      }

      let invoiceId;
      if (invoiceRes.rows.length > 0) {
        invoiceId = invoiceRes.rows[0].id;
      } else {
        // Create new pending invoice
        const invNum = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const newInv = await pool.query(
          `INSERT INTO invoices (invoice_number, patient_id, doctor_id, appointment_id, status, subtotal_amount, total_amount)
           VALUES ($1, $2, $3, $4, 'pending', 0, 0)
           RETURNING id`,
          [invNum, order.patient_id, order.ordered_by_doctor_id || null, order.appointment_id || null]
        );
        invoiceId = newInv.rows[0].id;
      }

      // Add line item
      const itemDesc = `Lab Test: ${order.test_name} (${order.order_number})`;
      const itemPrice = parseFloat(order.test_price || 0);

      const itemRes = await pool.query(
        `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, amount)
         VALUES ($1, 'lab', $2, 1, $3, $4)
         RETURNING id`,
        [invoiceId, itemDesc, itemPrice, itemPrice]
      );

      const invoiceItemId = itemRes.rows[0].id;

      // Update invoice totals
      await pool.query(
        `UPDATE invoices SET
          subtotal_amount = (SELECT COALESCE(SUM(amount), 0) FROM invoice_items WHERE invoice_id = $1),
          total_amount = (SELECT COALESCE(SUM(amount), 0) - COALESCE(discount_amount, 0) + COALESCE(tax_amount, 0) FROM invoice_items WHERE invoice_id = $1),
          updated_at = NOW()
         WHERE id = $1`,
        [invoiceId]
      );

      // Link order
      await LabOrder.linkInvoiceItem(id, invoiceItemId);

      return sendSuccess(res, { invoiceId, invoiceItemId }, 'Lab order successfully added to invoice');
    } catch (err) {
      console.error('Add to invoice error:', err.message);
      return sendError(res, `Failed to add lab order to invoice: ${err.message}`, 500);
    }
  }
};

module.exports = labController;
