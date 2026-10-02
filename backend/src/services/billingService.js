const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');
const notificationService = require('./notificationService');
const { query } = require('../config/database');

const billingService = {
  /**
   * Auto-create consultation invoice when an appointment is completed.
   * Guarded and idempotent (Rule 5): errors will never fail appointment completion.
   */
  async autoCreateConsultationInvoice({ appointmentId, patientId, doctorId, consultationFee = 0, createdBy = null }) {
    try {
      if (!appointmentId || !patientId) return null;

      // Check if invoice already exists for this appointment
      const existing = await query(`SELECT id FROM invoices WHERE appointment_id = $1`, [appointmentId]);
      if (existing.rows && existing.rows.length > 0) {
        return existing.rows[0];
      }

      const fee = Math.max(0, parseFloat(consultationFee) || 0);

      // Create consultation invoice
      const invoice = await Invoice.create({
        patientId,
        doctorId,
        appointmentId,
        items: [
          {
            itemType: 'consultation',
            description: 'Doctor Consultation Fee',
            quantity: 1,
            unitPrice: fee,
            sortOrder: 0
          }
        ],
        discountAmount: 0,
        taxAmount: 0,
        notes: 'Auto-generated invoice on appointment completion',
        createdBy
      });

      // Send notification to patient
      try {
        const patient = await Patient.findById(patientId);
        if (patient && patient.user_id) {
          await notificationService.notify(patient.user_id, {
            type: 'system',
            title: 'New Invoice Generated 🧾',
            message: `A new invoice (${invoice.invoice_number}) of ₹${invoice.total_amount} has been generated for your appointment.`,
            link: '/patient/billing',
            data: { invoiceId: invoice.id }
          });
        }
      } catch (notifErr) {
        console.error('Failed to send invoice notification:', notifErr.message);
      }

      return invoice;
    } catch (err) {
      if (err && err.code === '42P01') {
        console.warn('Billing tables missing, skipping auto invoice generation.');
      } else {
        console.error('Failed auto-creating consultation invoice:', err.message);
      }
      return null;
    }
  },

  async notifyPayment({ invoice, amount, patientUserId }) {
    try {
      if (patientUserId) {
        await notificationService.notify(patientUserId, {
          type: 'system',
          title: 'Payment Received 💳',
          message: `Payment of ₹${amount} received for Invoice #${invoice.invoice_number}. Current status: ${invoice.status.toUpperCase()}.`,
          link: '/patient/billing',
          data: { invoiceId: invoice.id }
        });
      }
    } catch (err) {
      console.error('Failed sending payment notification:', err.message);
    }
  }
};

module.exports = billingService;
