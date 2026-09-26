const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { generateTimeSlots, getDayOfWeek } = require('../utils/helpers');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const auditService = require('../services/auditService');

const appointmentController = {
  async create(req, res) {
    const { doctorId, appointmentDate, appointmentTime, reason, symptoms, isFirstVisit } = req.body;

    // Get patient profile
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    // Get doctor info
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return sendError(res, 'Doctor not found', 404);
    if (!doctor.is_available) return sendError(res, 'Doctor is not currently available', 400);

    // Check slot availability
    const isAvailable = await Appointment.checkSlotAvailability(doctorId, appointmentDate, appointmentTime);
    if (!isAvailable) return sendError(res, 'This time slot is already booked', 409);

    const appointment = await Appointment.create({
      patientId: patient.id,
      doctorId,
      departmentId: doctor.department_id,
      appointmentDate,
      appointmentTime,
      reason,
      symptoms,
      consultationFee: doctor.consultation_fee,
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
        doctorName: fullAppointment.doctor_name,
        date: appointmentDate,
        time: appointmentTime,
        appointmentId: appointment.id
      })
    ]).catch(console.error);

    await auditService.log(req, 'create', 'appointment', appointment.id, `Appointment booked with Dr. ${fullAppointment.doctor_name}`);

    return sendCreated(res, fullAppointment, 'Appointment booked successfully');
  },

  async getAvailableSlots(req, res) {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return sendError(res, 'Doctor ID and date are required', 400);

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return sendError(res, 'Doctor not found', 404);

    const dayOfWeek = getDayOfWeek(date);
    const schedule = await Doctor.getSchedule(doctorId);
    const daySchedule = schedule.find(s => s.day_of_week === dayOfWeek && s.is_active);

    if (!daySchedule) {
      return sendSuccess(res, { slots: [], message: 'Doctor is not available on this day' });
    }

    const allSlots = generateTimeSlots(
      daySchedule.start_time.substring(0, 5),
      daySchedule.end_time.substring(0, 5),
      daySchedule.slot_duration_minutes
    );

    const bookedSlots = await Appointment.getBookedSlots(doctorId, date);
    const availableSlots = allSlots.map(slot => ({
      time: slot,
      available: !bookedSlots.includes(slot)
    }));

    return sendSuccess(res, { slots: availableSlots, schedule: daySchedule });
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
        patientUserId: appointment.patient_profile_id, // This needs user_id
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

    notificationService.appointmentCompleted({
      patientUserId: appointment.patient_profile_id,
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
