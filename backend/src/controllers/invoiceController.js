const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const invoicePdfService = require('../services/invoicePdfService');
const billingService = require('../services/billingService');
const auditService = require('../services/auditService');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const handleTableMissing = (res, err) => {
  if (err && (err.code === '42P01' || err.message?.includes('relation "invoices" does not exist'))) {
    return sendError(res, 'Billing tables are missing. Run the Phase 8 migration.', 400);
  }
  return null;
};

const invoiceController = {
  async create(req, res) {
    try {
      const { patientId, doctorId, appointmentId, prescriptionId, items, discountAmount, taxAmount, notes, dueDate } = req.body;
      if (!patientId) return sendError(res, 'Patient ID is required', 400);
      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendError(res, 'Invoice must contain at least one item', 400);
      }

      const invoice = await Invoice.create({
        patientId, doctorId, appointmentId, prescriptionId,
        items, discountAmount, taxAmount, notes, dueDate,
        createdBy: req.user.userId
      });

      await auditService.log(req, 'create', 'invoice', invoice.id, `Invoice ${invoice.invoice_number} created`);
      return sendCreated(res, invoice, 'Invoice created successfully');
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to create invoice', 400);
    }
  },

  async getMyInvoices(req, res) {
    try {
      const { page, limit } = getPagination(req.query);
      const { status } = req.query;

      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient) return sendError(res, 'Patient profile not found', 404);

      const data = await Invoice.findByPatient(patient.id, { page, limit, status });
      return sendPaginated(res, data.invoices, buildPaginationMeta(data.total, page, limit));
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to fetch invoices', 500);
    }
  },

  async getDoctorInvoices(req, res) {
    try {
      const { page, limit } = getPagination(req.query);
      const { status } = req.query;

      let doctorId = req.user.doctorId;
      if (!doctorId) {
        const doctor = await Doctor.findByUserId(req.user.userId);
        if (!doctor) return sendError(res, 'Doctor profile not found', 404);
        doctorId = doctor.id;
      }

      const data = await Invoice.findByDoctor(doctorId, { page, limit, status });
      return sendPaginated(res, data.invoices, buildPaginationMeta(data.total, page, limit));
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to fetch doctor invoices', 500);
    }
  },

  async getById(req, res) {
    try {
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) return sendError(res, 'Invoice not found', 404);

      // Access verification
      if (req.user.role === 'patient') {
        const patient = await Patient.findByUserId(req.user.userId);
        if (!patient || invoice.patient_id !== patient.id) {
          return sendError(res, 'Invoice not found', 404); // Do not leak existence
        }
      } else if (req.user.role === 'doctor') {
        let doctorId = req.user.doctorId;
        if (!doctorId) {
          const doctor = await Doctor.findByUserId(req.user.userId);
          doctorId = doctor ? doctor.id : null;
        }
        if (!doctorId || invoice.doctor_id !== doctorId) {
          return sendError(res, 'Invoice not found', 404);
        }
      }

      return sendSuccess(res, invoice);
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to fetch invoice', 500);
    }
  },

  async getAll(req, res) {
    try {
      const { page, limit } = getPagination(req.query);
      const { status, search, from, to } = req.query;

      const data = await Invoice.getAll({ page, limit, status, search, from, to });
      return sendPaginated(res, data.invoices, buildPaginationMeta(data.total, page, limit));
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to fetch invoices', 500);
    }
  },

  async getStats(req, res) {
    try {
      const stats = await Invoice.getStats();
      return sendSuccess(res, stats);
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to fetch invoice stats', 500);
    }
  },

  async update(req, res) {
    try {
      const { items, discountAmount, taxAmount, notes, dueDate } = req.body;
      const updated = await Invoice.update({
        id: req.params.id,
        items, discountAmount, taxAmount, notes, dueDate
      });

      await auditService.log(req, 'update', 'invoice', updated.id, `Invoice ${updated.invoice_number} updated`);
      return sendSuccess(res, updated, 'Invoice updated successfully');
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to update invoice', 400);
    }
  },

  async addPayment(req, res) {
    try {
      const { amount, method, status = 'success', transactionRef } = req.body;
      if (!method) return sendError(res, 'Payment method is required', 400);

      const payment = await Invoice.addPayment({
        invoiceId: req.params.id,
        amount, method, status, transactionRef,
        recordedBy: req.user.userId
      });

      const updatedInvoice = await Invoice.findById(req.params.id);

      // Extension point for Payment Gateway integration:
      // // TODO: Payment gateway webhook/redirection logic goes here
      
      // Notify patient
      if (updatedInvoice) {
        const patient = await Patient.findById(updatedInvoice.patient_id);
        if (patient && patient.user_id) {
          billingService.notifyPayment({
            invoice: updatedInvoice,
            amount: payment.amount,
            patientUserId: patient.user_id
          }).catch(console.error);
        }
      }

      await auditService.log(req, 'payment', 'invoice', req.params.id, `Payment of ₹${amount} recorded (${method})`);
      return sendSuccess(res, { payment, invoice: updatedInvoice }, 'Payment recorded successfully');
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to record payment', 400);
    }
  },

  async cancel(req, res) {
    try {
      const cancelled = await Invoice.cancel(req.params.id);
      await auditService.log(req, 'cancel', 'invoice', req.params.id, `Invoice ${cancelled.invoice_number} cancelled`);
      return sendSuccess(res, cancelled, 'Invoice cancelled successfully');
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to cancel invoice', 400);
    }
  },

  async downloadPDF(req, res) {
    try {
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) return sendError(res, 'Invoice not found', 404);

      // Access control
      if (req.user.role === 'patient') {
        const patient = await Patient.findByUserId(req.user.userId);
        if (!patient || invoice.patient_id !== patient.id) {
          return sendError(res, 'Invoice not found', 404);
        }
      } else if (req.user.role === 'doctor') {
        let doctorId = req.user.doctorId;
        if (!doctorId) {
          const doctor = await Doctor.findByUserId(req.user.userId);
          doctorId = doctor ? doctor.id : null;
        }
        if (!doctorId || invoice.doctor_id !== doctorId) {
          return sendError(res, 'Invoice not found', 404);
        }
      }

      const pdfBuffer = await invoicePdfService.generatePDF(invoice);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to generate PDF', 500);
    }
  },

  async exportCSV(req, res) {
    try {
      const { status, search, from, to } = req.query;
      const data = await Invoice.getAll({ page: 1, limit: 1000, status, search, from, to });

      const escapeCell = (val) => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        // Formula injection protection: escape =, +, -, @
        if (/^[=+\-@]/.test(str)) {
          str = "'" + str;
        }
        return `"${str}"`;
      };

      const headers = ['Invoice Number', 'Patient Name', 'Doctor Name', 'Subtotal', 'Discount', 'Tax', 'Total Amount', 'Paid Amount', 'Status', 'Created At'];
      const rows = data.invoices.map(inv => [
        escapeCell(inv.invoice_number),
        escapeCell(inv.patient_name),
        escapeCell(inv.doctor_name || 'N/A'),
        escapeCell(parseFloat(inv.subtotal || 0).toFixed(2)),
        escapeCell(parseFloat(inv.discount_amount || 0).toFixed(2)),
        escapeCell(parseFloat(inv.tax_amount || 0).toFixed(2)),
        escapeCell(parseFloat(inv.total_amount || 0).toFixed(2)),
        escapeCell(parseFloat(inv.paid_amount || 0).toFixed(2)),
        escapeCell(inv.status),
        escapeCell(inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : '')
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="invoices-export.csv"');
      return res.send(csvContent);
    } catch (err) {
      if (handleTableMissing(res, err)) return;
      return sendError(res, err.message || 'Failed to export CSV', 500);
    }
  }
};

module.exports = invoiceController;
