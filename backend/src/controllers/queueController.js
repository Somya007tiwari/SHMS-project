const QueueToken = require('../models/QueueToken');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const notificationService = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const queueController = {
  // POST /api/queue/check-in
  async checkIn(req, res) {
    try {
      const { appointmentId } = req.body;
      if (!appointmentId) {
        return sendError(res, 'Appointment ID is required', 400);
      }

      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return sendError(res, 'Appointment not found', 404);
      }

      // Check appointment status
      if (appointment.status === 'pending') {
        return sendError(res, 'Your appointment is pending doctor approval. Only approved appointments can check in.', 400);
      }
      if (appointment.status === 'rejected') {
        return sendError(res, 'Cannot check in. This appointment was rejected.', 400);
      }
      if (appointment.status === 'cancelled') {
        return sendError(res, 'Cannot check in. This appointment was cancelled.', 400);
      }
      if (appointment.status === 'completed') {
        return sendError(res, 'This appointment has already been completed.', 400);
      }
      if (appointment.status !== 'approved') {
        return sendError(res, `Check-in unavailable for appointment status: ${appointment.status}`, 400);
      }

      // Verify role & ownership
      if (req.user.role === 'patient') {
        if (appointment.patient_user_id !== req.user.userId) {
          return sendError(res, 'Access forbidden: You can only check in to your own appointments.', 403);
        }
      } else if (req.user.role === 'doctor') {
        if (appointment.doctor_user_id !== req.user.userId) {
          return sendError(res, 'Access forbidden: You can only check in patients for your own appointments.', 403);
        }
      }

      // Timezone check: Asia/Kolkata "today"
      const todayIST = QueueToken.getTodayIST();
      const apptDateStr = new Date(appointment.appointment_date).toISOString().split('T')[0];

      if (apptDateStr < todayIST) {
        return sendError(res, 'Check-in is only allowed on the day of the appointment. This appointment was for a past date.', 400);
      }
      if (apptDateStr > todayIST) {
        return sendError(res, 'Check-in is only allowed on the day of the appointment.', 400);
      }

      // Check-in window validation (for patients): 60 mins before slot start time to 120 mins after
      if (req.user.role === 'patient') {
        const slotTimeStr = String(appointment.appointment_time).substring(0, 5); // "HH:MM"
        const [slotH, slotM] = slotTimeStr.split(':').map(Number);
        const slotMinutes = slotH * 60 + slotM;

        // Current time in IST (minutes from midnight)
        const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();

        const windowStart = slotMinutes - 60; // 60 mins before slot
        const windowEnd = slotMinutes + 120; // 120 mins after slot

        if (currentMinutes < windowStart) {
          return sendError(res, `Check-in opens 60 minutes before your slot time (${slotTimeStr}).`, 400);
        }
        if (currentMinutes > windowEnd) {
          return sendError(res, `Check-in window closed. (Closed 120 minutes after slot time ${slotTimeStr}).`, 400);
        }
      }

      // Execute transactional check-in
      const { token, isNew } = await QueueToken.checkInTransaction(appointment.id, appointment.doctor_id, todayIST);

      return sendSuccess(
        res,
        isNew ? `Checked in successfully. Your token is #${token.token_number}` : `Already checked in. Token #${token.token_number}`,
        token,
        isNew ? 201 : 200
      );
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Queue feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Check-in failed', err.statusCode || 500);
    }
  },

  // GET /api/queue/doctor/today
  async getDoctorTodayQueue(req, res) {
    try {
      let doctorId = null;
      if (req.user.role === 'doctor') {
        const doctor = await Doctor.findByUserId(req.user.userId);
        if (!doctor) return sendError(res, 'Doctor profile not found', 404);
        doctorId = doctor.id;
      } else if (req.user.role === 'admin' && req.query.doctorId) {
        doctorId = req.query.doctorId;
      } else {
        return sendError(res, 'Doctor ID is required', 400);
      }

      const todayIST = QueueToken.getTodayIST();
      const queue = await QueueToken.getDoctorTodayQueue(doctorId, todayIST);

      return sendSuccess(res, "Today's queue retrieved successfully", queue);
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Queue feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to retrieve queue', 500);
    }
  },

  // POST /api/queue/call-next
  async callNext(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.userId);
      if (!doctor) {
        return sendError(res, 'Doctor profile not found', 404);
      }

      const todayIST = QueueToken.getTodayIST();
      const result = await QueueToken.callNextToken(doctor.id, todayIST);

      // Guarded notifications
      try {
        if (result.patientUserId) {
          notificationService.notify(result.patientUserId, {
            type: 'queue_called',
            title: 'It is your turn! 🚨',
            message: `Token #${result.calledToken.token_number}: Please proceed to Room ${result.roomNumber || '101'}.`,
            link: '/patient/appointments'
          });
        }

        if (result.twoBehindPatientUserId) {
          notificationService.notify(result.twoBehindPatientUserId, {
            type: 'queue_reminder',
            title: 'Queue Update ⏰',
            message: `You are 2 tokens away (Token #${result.twoBehindTokenNumber}). Please be near Room ${result.roomNumber || '101'}.`,
            link: '/patient/appointments'
          });
        }
      } catch (notifErr) {
        console.error('Queue notification error:', notifErr.message);
      }

      return sendSuccess(res, `Calling Token #${result.calledToken.token_number}`, result.calledToken);
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Queue feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to call next token', err.statusCode || 500);
    }
  },

  // POST /api/queue/token/:tokenId/status
  async updateTokenStatus(req, res) {
    try {
      const { tokenId } = req.params;
      const { status, action } = req.body;

      const allowedStatuses = ['completed', 'skipped', 'no_show'];
      if (!allowedStatuses.includes(status)) {
        return sendError(res, `Invalid status. Allowed: ${allowedStatuses.join(', ')}`, 400);
      }

      const doctor = await Doctor.findByUserId(req.user.userId);
      if (!doctor) {
        return sendError(res, 'Doctor profile not found', 404);
      }

      const updatedToken = await QueueToken.updateTokenStatus(tokenId, doctor.id, status, action);

      return sendSuccess(res, `Token status updated to ${status}`, updatedToken);
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Queue feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to update token status', err.statusCode || 500);
    }
  },

  // GET /api/queue/my-token?appointmentId=...
  async getMyToken(req, res) {
    try {
      const { appointmentId } = req.query;
      if (!appointmentId) {
        return sendError(res, 'Appointment ID parameter is required', 400);
      }

      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient) {
        return sendError(res, 'Patient profile not found', 404);
      }

      const tokenDetails = await QueueToken.getMyTokenDetails(appointmentId, patient.id);
      if (!tokenDetails) {
        return sendError(res, 'No token found for this appointment', 404);
      }

      return sendSuccess(res, 'Queue token details retrieved', tokenDetails);
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Queue feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to retrieve token details', err.statusCode || 500);
    }
  },

  // GET /api/queue/board
  async getBoard(req, res) {
    try {
      const todayIST = QueueToken.getTodayIST();
      const boardData = await QueueToken.getAdminBoard(todayIST);
      return sendSuccess(res, 'Queue board data retrieved', boardData);
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Queue feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to retrieve queue board', 500);
    }
  }
};

module.exports = queueController;
