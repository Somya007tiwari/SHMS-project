const { Notification } = require('../models/Notification');
const { NOTIFICATION_TYPES } = require('../utils/constants');

const notificationService = {
  async notify(userId, { type, title, message, link = null, data = {} }) {
    try {
      if (!userId) return null;
      return await Notification.create({
        userId,
        type: type || 'system',
        title,
        message,
        link,
        data,
      });
    } catch (err) {
      console.error('Failed to create in-app notification:', err.message);
      return null;
    }
  },

  async appointmentBooked({ patientUserId, doctorUserId, doctorName, patientName, date, time, appointmentId }) {
    await Promise.all([
      this.notify(patientUserId, {
        type: 'appointment_booked',
        title: 'Appointment Booked',
        message: `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been booked and is pending approval.`,
        link: '/patient/appointments',
        data: { appointmentId }
      }),
      doctorUserId && this.notify(doctorUserId, {
        type: 'appointment_booked',
        title: 'New Appointment Request 📅',
        message: `New appointment requested by ${patientName} for ${date} at ${time}.`,
        link: '/doctor/appointments',
        data: { appointmentId }
      })
    ]).catch(console.error);
  },

  async appointmentApproved({ patientUserId, doctorName, date, time, appointmentId }) {
    return this.notify(patientUserId, {
      type: 'appointment_approved',
      title: 'Appointment Approved ✅',
      message: `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been approved.`,
      link: '/patient/appointments',
      data: { appointmentId }
    });
  },

  async appointmentRejected({ patientUserId, doctorName, date, time, reason, appointmentId }) {
    return this.notify(patientUserId, {
      type: 'appointment_rejected',
      title: 'Appointment Rejected ❌',
      message: `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
      link: '/patient/appointments',
      data: { appointmentId }
    });
  },

  async appointmentCancelled({ targetUserId, isDoctor, otherPartyName, date, time, appointmentId }) {
    return this.notify(targetUserId, {
      type: 'appointment_cancelled',
      title: 'Appointment Cancelled 🚫',
      message: `Appointment on ${date} at ${time} with ${isDoctor ? 'Patient ' : 'Dr. '}${otherPartyName} has been cancelled.`,
      link: isDoctor ? '/doctor/appointments' : '/patient/appointments',
      data: { appointmentId }
    });
  },

  async appointmentRescheduled({ doctorUserId, patientUserId, doctorName, patientName, newDate, newTime, appointmentId }) {
    await Promise.all([
      this.notify(patientUserId, {
        type: 'appointment_rescheduled',
        title: 'Appointment Rescheduled 🔄',
        message: `Your appointment with Dr. ${doctorName} has been rescheduled to ${newDate} at ${newTime}.`,
        link: '/patient/appointments',
        data: { appointmentId }
      }),
      doctorUserId && this.notify(doctorUserId, {
        type: 'appointment_rescheduled',
        title: 'Appointment Rescheduled 🔄',
        message: `${patientName} has rescheduled their appointment to ${newDate} at ${newTime}.`,
        link: '/doctor/appointments',
        data: { appointmentId }
      })
    ]).catch(console.error);
  },

  async doctorLeaveAffected({ patientUserId, doctorName, leaveStartDate, leaveEndDate, date, time, appointmentId }) {
    return this.notify(patientUserId, {
      type: 'doctor_leave_affected',
      title: 'Action Needed: Doctor on Leave 🗓️',
      message: `Dr. ${doctorName} will be on leave from ${leaveStartDate} to ${leaveEndDate}. Your appointment on ${date} at ${time} needs to be rescheduled.`,
      link: '/patient/appointments',
      data: { appointmentId }
    });
  },

  async appointmentReminder({ patientUserId, doctorName, date, time, hours, appointmentId }) {
    return this.notify(patientUserId, {
      type: 'appointment_reminder',
      title: `Upcoming Appointment Reminder (${hours}h) ⏰`,
      message: `Reminder: You have an appointment with Dr. ${doctorName} in ${hours === 1 ? '1 hour' : '24 hours'} on ${date} at ${time}.`,
      link: '/patient/appointments',
      data: { appointmentId }
    });
  },

  async appointmentCompleted({ patientUserId, doctorName, appointmentId }) {
    return this.notify(patientUserId, {
      type: 'appointment_completed',
      title: 'Consultation Completed',
      message: `Your consultation with Dr. ${doctorName} has been marked as completed.`,
      link: '/patient/appointments',
      data: { appointmentId }
    });
  },

  async prescriptionGenerated({ patientUserId, doctorName, prescriptionId }) {
    return this.notify(patientUserId, {
      type: 'prescription_generated',
      title: 'New Prescription Available 💊',
      message: `Dr. ${doctorName} has created a prescription for you. You can download it from your portal.`,
      link: '/patient/prescriptions',
      data: { prescriptionId }
    });
  },

  async paymentConfirmed({ patientUserId, billNumber, amount, billId }) {
    return this.notify(patientUserId, {
      type: 'payment_confirmed',
      title: 'Payment Confirmed ✅',
      message: `Payment of ₹${amount} for bill ${billNumber} has been confirmed.`,
      link: '/patient/billing',
      data: { billId }
    });
  },

  async reportUploaded({ patientUserId, reportTitle, reportId }) {
    return this.notify(patientUserId, {
      type: 'report_uploaded',
      title: 'New Report Available',
      message: `A new medical report "${reportTitle}" has been uploaded and is available for download.`,
      link: '/patient/reports',
      data: { reportId }
    });
  }
};

module.exports = notificationService;
