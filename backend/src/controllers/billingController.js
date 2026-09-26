const Bill = require('../models/Bill');
const Patient = require('../models/Patient');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const auditService = require('../services/auditService');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const billingController = {
  async create(req, res) {
    const {
      patientId, appointmentId, consultationCharge, labCharges,
      medicationCharges, otherCharges, discount, taxPercentage, dueDate, notes
    } = req.body;

    const bill = await Bill.create({
      patientId, appointmentId, consultationCharge: consultationCharge || 0,
      labCharges: labCharges || 0, medicationCharges: medicationCharges || 0,
      otherCharges: otherCharges || 0, discount: discount || 0,
      taxPercentage: taxPercentage || 18, dueDate, notes,
      createdBy: req.user.userId
    });

    await auditService.log(req, 'create', 'bill', bill.id, `Bill ${bill.bill_number} created`);
    return sendCreated(res, bill, 'Bill created successfully');
  },

  async getById(req, res) {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return sendError(res, 'Bill not found', 404);
    return sendSuccess(res, bill);
  },

  async getMyBills(req, res) {
    const { page, limit } = getPagination(req.query);
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    const data = await Bill.getByPatient(patient.id, { page, limit });
    return sendPaginated(res, data.bills, buildPaginationMeta(data.total, page, limit));
  },

  async addPayment(req, res) {
    const { amount, paymentMethod, transactionId, notes } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill) return sendError(res, 'Bill not found', 404);

    if (bill.status === 'paid') return sendError(res, 'Bill is already fully paid', 400);

    const payment = await Bill.addPayment({
      billId: bill.id,
      patientId: bill.patient_id,
      amount, paymentMethod, transactionId, notes,
      processedBy: req.user.userId
    });

    // Get updated bill
    const updatedBill = await Bill.findById(bill.id);

    // Notify patient
    notificationService.paymentConfirmed({
      patientUserId: req.user.userId,
      billNumber: bill.bill_number,
      amount,
      billId: bill.id
    }).catch(console.error);

    emailService.sendPaymentConfirmation({
      email: bill.patient_email,
      patientName: bill.patient_name,
      billNumber: bill.bill_number,
      amount,
      paymentMethod
    }).catch(console.error);

    await auditService.log(req, 'payment', 'bill', bill.id, `Payment of ₹${amount} received via ${paymentMethod}`);
    return sendSuccess(res, { payment, bill: updatedBill }, 'Payment recorded successfully');
  },

  async downloadPDF(req, res) {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return sendError(res, 'Bill not found', 404);

    const pdfBuffer = await pdfService.generateInvoice(bill);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${bill.bill_number}.pdf"`);
    res.send(pdfBuffer);
  },

  async getAll(req, res) {
    const { page, limit } = getPagination(req.query);
    const { status, patientId } = req.query;

    const data = await Bill.getAll({ page, limit, status, patientId });
    return sendPaginated(res, data.bills, buildPaginationMeta(data.total, page, limit));
  },

  async getRevenueStats(req, res) {
    const stats = await Bill.getRevenueStats();
    return sendSuccess(res, stats);
  }
};

module.exports = billingController;
