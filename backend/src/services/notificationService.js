const { Notification } = require('../models/Notification');
const { NOTIFICATION_TYPES } = require('../utils/constants');

const notificationService = {
  async appointmentBooked({ patientUserId, doctorName, date, time, appointmentId }) {
    return Notification.create({
      userId: patientUserId,
      type: NOTIFICATION_TYPES.APPOINTMENT_BOOKED,
      title: 'Appointment Booked',
      message: `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been booked and is pending approval.`,
      data: { appointmentId }
    });
  },

  async appointmentApproved({ patientUserId, doctorName, date, time, appointmentId }) {
    return Notification.create({
      userId: patientUserId,
      type: NOTIFICATION_TYPES.APPOINTMENT_APPROVED,
      title: 'Appointment Approved ✅',
      message: `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been approved.`,
      data: { appointmentId }
    });
  },

  async appointmentRejected({ patientUserId, doctorName, date, time, reason, appointmentId }) {
    return Notification.create({
      userId: patientUserId,
      type: NOTIFICATION_TYPES.APPOINTMENT_REJECTED,
      title: 'Appointment Rejected',
      message: `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
      data: { appointmentId }
    });
  },

  async appointmentCompleted({ patientUserId, doctorName, appointmentId }) {
    return Notification.create({
      userId: patientUserId,
      type: NOTIFICATION_TYPES.APPOINTMENT_COMPLETED,
      title: 'Consultation Completed',
      message: `Your consultation with Dr. ${doctorName} has been marked as completed.`,
      data: { appointmentId }
    });
  },

  async prescriptionGenerated({ patientUserId, doctorName, prescriptionId }) {
    return Notification.create({
      userId: patientUserId,
      type: NOTIFICATION_TYPES.PRESCRIPTION_GENERATED,
      title: 'New Prescription Available 💊',
      message: `Dr. ${doctorName} has created a prescription for you. You can download it from your portal.`,
      data: { prescriptionId }
    });
  },

  async paymentConfirmed({ patientUserId, billNumber, amount, billId }) {
    return Notification.create({
      userId: patientUserId,
      type: NOTIFICATION_TYPES.PAYMENT_CONFIRMED,
      title: 'Payment Confirmed ✅',
      message: `Payment of ₹${amount} for bill ${billNumber} has been confirmed.`,
      data: { billId }
    });
  },

  async reportUploaded({ patientUserId, reportTitle, reportId }) {
    return Notification.create({
      userId: patientUserId,
      type: NOTIFICATION_TYPES.REPORT_UPLOADED,
      title: 'New Report Available',
      message: `A new medical report "${reportTitle}" has been uploaded and is available for download.`,
      data: { reportId }
    });
  }
};

module.exports = notificationService;
