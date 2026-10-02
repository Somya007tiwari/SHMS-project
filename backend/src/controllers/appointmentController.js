const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const DoctorLeave = require('../models/DoctorLeave');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { generateTimeSlots, getDayOfWeek } = require('../utils/helpers');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const auditService = require('../services/auditService');
const billingService = require('../services/billingService');

const appointmentController = {
  async create(req, res) {
    const { doctorId, appointmentDate, appointmentTime, reason, symptoms, isFirstVisit } = req.body;

    if (!doctorId) return sendError(res, 'Doctor ID is required', 400);
    if (!appointmentDate) return sendError(res, 'Appointment date is required', 400);
    if (!appointmentTime) return sendError(res, 'Appointment time is required', 400);
    if (!reason || !reason.trim()) return sendError(res, 'Reason for visit is required', 400);

    // Validate past dates & past times
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (appointmentDate < todayStr) {
      return sendError(res, 'Cannot book appointments for past dates', 400);
    }
    if (appointmentDate === todayStr && appointmentTime <= currentHHmm) {
      return sendError(res, 'Cannot book appointments for past time slots', 400);
    }

    // Get patient profile
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    try {
      const appointment = await Appointment.createWithLock({
        patientId: patient.id,
        doctorId,
        appointmentDate,
        appointmentTime,
        reason: reason.trim(),
        symptoms: symptoms ? symptoms.trim() : null,
        isFirstVisit
      });

      const fullAppointment = await Appointment.findById(appointment.id);

      // Send notifications (non-blocking)
      Promise.all([
        emailService.sendAppointmentConfirmation({
          email: req.user.email,
          patientName: `${fullAppointment.patient_name}`,
          doctorName: fullAppointment.doctor_name,
          department: fullAppointment.department_name,
          date: appointmentDate,
          time: appointmentTime,
          reason
        }),
        notificationService.appointmentBooked({
          patientUserId: req.user.userId,
          doctorUserId: fullAppointment.doctor_user_id,
          doctorName: fullAppointment.doctor_name,
          patientName: fullAppointment.patient_name,
          date: appointmentDate,
          time: appointmentTime,
          appointmentId: appointment.id
        })
      ]).catch(console.error);

      await auditService.log(req, 'create', 'appointment', appointment.id, `Appointment booked with Dr. ${fullAppointment.doctor_name}`);

      return sendCreated(res, fullAppointment, 'Appointment booked successfully');
    } catch (err) {
      return sendError(res, err.message || 'Failed to book appointment', err.statusCode || 500);
    }
  },

  async reschedule(req, res) {
    const { id } = req.params;
    const { appointmentDate, appointmentTime } = req.body;

    if (!appointmentDate) return sendError(res, 'New appointment date is required', 400);
    if (!appointmentTime) return sendError(res, 'New appointment time is required', 400);

    let patientId = null;
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient) return sendError(res, 'Patient profile not found', 404);
      patientId = patient.id;
    }

    try {
      const updated = await Appointment.rescheduleWithLock({
        appointmentId: id,
        patientId,
        newDate: appointmentDate,
        newTime: appointmentTime
      });

      const fullAppointment = await Appointment.findById(updated.id);

      Promise.all([
        emailService.sendAppointmentRescheduled({
          email: fullAppointment.patient_email,
          patientName: fullAppointment.patient_name,
          doctorName: fullAppointment.doctor_name,
          date: appointmentDate,
          time: appointmentTime
        }),
        notificationService.appointmentRescheduled({
          doctorUserId: fullAppointment.doctor_user_id,
          patientUserId: fullAppointment.patient_user_id,
          doctorName: fullAppointment.doctor_name,
          patientName: fullAppointment.patient_name,
          newDate: appointmentDate,
          newTime: appointmentTime,
          appointmentId: fullAppointment.id
        })
      ]).catch(console.error);

      await auditService.log(
        req,
        'update',
        'appointment',
        updated.id,
        `Appointment rescheduled to ${appointmentDate} ${appointmentTime}`
      );

      return sendSuccess(res, fullAppointment, 'Appointment rescheduled successfully');
    } catch (err) {
      return sendError(res, err.message || 'Reschedule failed', err.statusCode || 500);
    }
  },

  async getAvailableSlots(req, res) {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return sendError(res, 'Doctor ID and date are required', 400);

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return sendError(res, 'Doctor not found', 404);
    if (!doctor.is_available) {
      return sendSuccess(res, { slots: [], isAvailable: false, message: 'Doctor is currently unavailable' });
    }

    // Check doctor leaves on date
    const leaves = await DoctorLeave.checkLeaveForDate(doctorId, date);
    const fullDayLeave = leaves.find((l) => !l.start_time || !l.end_time);

    if (fullDayLeave) {
      return sendSuccess(res, {
        slots: [],
        isLeave: true,
        leaveReason: fullDayLeave.reason || 'Doctor is on leave on this date',
        isAvailable: false,
        message: 'Doctor is on leave on this date'
      });
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (date < todayStr) {
      return sendSuccess(res, { slots: [], isPast: true, message: 'Cannot book appointments for past dates' });
    }

    const dayOfWeek = getDayOfWeek(date);
    const schedule = await Doctor.getSchedule(doctorId);
    const daySchedule = schedule.find(s => s.day_of_week === dayOfWeek && (s.is_active === true || s.is_active === 'true'));

    if (!daySchedule) {
      return sendSuccess(res, { slots: [], isDayOff: true, message: 'Doctor is off on this day' });
    }

    const startTimeStr = daySchedule.start_time ? daySchedule.start_time.substring(0, 5) : '09:00';
    const endTimeStr = daySchedule.end_time ? daySchedule.end_time.substring(0, 5) : '17:00';
    const bStartStr = daySchedule.break_start_time ? daySchedule.break_start_time.substring(0, 5) : null;
    const bEndStr = daySchedule.break_end_time ? daySchedule.break_end_time.substring(0, 5) : null;
    const duration = daySchedule.slot_duration_minutes || 30;

    let allSlots = generateTimeSlots(startTimeStr, endTimeStr, duration, bStartStr, bEndStr);

    if (date === todayStr) {
      const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      allSlots = allSlots.filter(s => s > currentHHmm);
    }

    const bookedSlots = await Appointment.getBookedSlots(doctorId, date);
    const availableSlots = allSlots.map(slot => {
      const isBooked = bookedSlots.includes(slot);
      let isLeaveSlot = false;

      for (const leave of leaves) {
        if (leave.start_time && leave.end_time) {
          const lStart = String(leave.start_time).substring(0, 5);
          const lEnd = String(leave.end_time).substring(0, 5);
          if (slot >= lStart && slot <= lEnd) {
            isLeaveSlot = true;
            break;
          }
        }
      }

      return {
        time: slot,
        available: !isBooked && !isLeaveSlot,
        reason: isLeaveSlot ? 'Doctor on leave' : isBooked ? 'Booked' : null
      };
    });

    return sendSuccess(res, { slots: availableSlots, schedule: daySchedule, isDayOff: false, isAvailable: true, hasPartialLeave: leaves.length > 0 });
  },

  async getMyAppointments(req, res) {
    const { page, limit, offset } = getPagination(req.query);
    const { status } = req.query;

    let data;
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient) return sendError(res, 'Patient profile not found', 404);
      data = await Appointment.getByPatient(patient.id, { page, limit, status });
    } else if (req.user.role === 'doctor') {
      data = await Appointment.getByDoctor(req.user.doctorId, { page, limit, status });
    } else {
      return sendError(res, 'Unauthorized', 403);
    }

    return sendPaginated(
      res,
      data.appointments,
      buildPaginationMeta(data.total, page, limit)
    );
  },

  async getById(req, res) {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 'Appointment not found', 404);
    return sendSuccess(res, appointment);
  },

  async approve(req, res) {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    if (req.user.role === 'doctor' && appointment.doctor_id !== req.user.doctorId) {
      return sendError(res, 'Access denied', 403);
    }

    if (appointment.status !== 'pending') {
      return sendError(res, `Cannot approve appointment with status: ${appointment.status}`, 400);
    }

    const updated = await Appointment.updateStatus(appointment.id, 'approved');

    // Notify patient
    Promise.all([
      emailService.sendAppointmentStatusUpdate({
        email: appointment.patient_email,
        patientName: appointment.patient_name,
        doctorName: appointment.doctor_name,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        status: 'approved'
      }),
      notificationService.appointmentApproved({
        patientUserId: appointment.patient_user_id,
        doctorName: appointment.doctor_name,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        appointmentId: appointment.id
      })
    ]).catch(console.error);

    await auditService.log(req, 'approve', 'appointment', appointment.id, `Appointment approved`);
    return sendSuccess(res, updated, 'Appointment approved');
  },

  async reject(req, res) {
    const { rejectionReason } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    if (req.user.role === 'doctor' && appointment.doctor_id !== req.user.doctorId) {
      return sendError(res, 'Access denied', 403);
    }

    if (!['pending'].includes(appointment.status)) {
      return sendError(res, `Cannot reject appointment with status: ${appointment.status}`, 400);
    }

    const updated = await Appointment.updateStatus(appointment.id, 'rejected', { rejectionReason });

    Promise.all([
      emailService.sendAppointmentStatusUpdate({
        email: appointment.patient_email,
        patientName: appointment.patient_name,
        doctorName: appointment.doctor_name,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        status: 'rejected',
        rejectionReason
      }),
      notificationService.appointmentRejected({
        patientUserId: appointment.patient_user_id,
        doctorName: appointment.doctor_name,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        reason: rejectionReason,
        appointmentId: appointment.id
      })
    ]).catch(console.error);

    await auditService.log(req, 'reject', 'appointment', appointment.id, `Appointment rejected: ${rejectionReason}`);
    return sendSuccess(res, updated, 'Appointment rejected');
  },

  async cancel(req, res) {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    if (!['pending', 'approved'].includes(appointment.status)) {
      return sendError(res, `Cannot cancel appointment with status: ${appointment.status}`, 400);
    }

    const updated = await Appointment.updateStatus(appointment.id, 'cancelled');

    const isDoctor = req.user.role === 'doctor';
    const targetUserId = isDoctor ? appointment.patient_user_id : appointment.doctor_user_id;
    const targetEmail = isDoctor ? appointment.patient_email : appointment.doctor_email;
    const otherPartyName = isDoctor ? appointment.patient_name : appointment.doctor_name;

    Promise.all([
      targetEmail && emailService.sendAppointmentStatusUpdate({
        email: targetEmail,
        patientName: appointment.patient_name,
        doctorName: appointment.doctor_name,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        status: 'cancelled'
      }),
      targetUserId && notificationService.appointmentCancelled({
        targetUserId,
        isDoctor: !isDoctor,
        otherPartyName,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        appointmentId: appointment.id
      })
    ]).catch(console.error);

    await auditService.log(req, 'cancel', 'appointment', appointment.id, 'Appointment cancelled');
    return sendSuccess(res, updated, 'Appointment cancelled');
  },

  async complete(req, res) {
    const { notes } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    if (appointment.status !== 'approved') {
      return sendError(res, 'Only approved appointments can be marked as completed', 400);
    }

    const updated = await Appointment.updateStatus(appointment.id, 'completed', { notes });

    // Auto-create consultation invoice (guarded, idempotent)
    billingService.autoCreateConsultationInvoice({
      appointmentId: appointment.id,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      consultationFee: appointment.consultation_fee || 0,
      createdBy: req.user ? req.user.userId : null
    }).catch(console.error);

    notificationService.appointmentCompleted({
      patientUserId: appointment.patient_user_id,
      doctorName: appointment.doctor_name,
      appointmentId: appointment.id
    }).catch(console.error);

    await auditService.log(req, 'update', 'appointment', appointment.id, 'Appointment marked complete');
    return sendSuccess(res, updated, 'Appointment marked as completed');
  },

  // Admin: get all appointments
  async getAll(req, res) {
    const { page, limit } = getPagination(req.query);
    const { status, doctorId, patientId, fromDate, toDate } = req.query;

    const data = await Appointment.getAll({ page, limit, status, doctorId, patientId, fromDate, toDate });
    return sendPaginated(res, data.appointments, buildPaginationMeta(data.total, page, limit));
  }
};

module.exports = appointmentController;
