const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Patient = require('../models/Patient');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const auditService = require('../services/auditService');
const emailService = require('../services/emailService');

const doctorController = {
  async getAll(req, res) {
    const { page, limit } = getPagination(req.query);
    const { departmentId, search, isAvailable } = req.query;
    const data = await Doctor.getAll({
      page, limit, departmentId, search,
      isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined
    });
    return sendPaginated(res, data.doctors, buildPaginationMeta(data.total, page, limit));
  },

  async getById(req, res) {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return sendError(res, 'Doctor not found', 404);
    return sendSuccess(res, doctor);
  },

  async create(req, res) {
    const { email, firstName, lastName, phone, password = 'Doctor@123456', ...doctorData } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) return sendError(res, 'Email already registered', 409);

    const user = await User.create({ email, password, role: 'doctor', firstName, lastName, phone });
    const doctor = await Doctor.create(user.id, doctorData);

    emailService.sendWelcome({ email, name: `Dr. ${firstName} ${lastName}`, role: 'doctor' }).catch(console.error);
    await auditService.log(req, 'create', 'doctor', doctor.id, `Doctor account created: ${email}`);

    return sendCreated(res, { user, doctor }, 'Doctor created successfully');
  },

  async update(req, res) {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return sendError(res, 'Doctor not found', 404);

    const { firstName, lastName, phone, ...doctorData } = req.body;

    if (firstName || lastName || phone) {
      await User.update(doctor.user_id, { firstName, lastName, phone });
    }
    if (req.uploadedFile) {
      await User.update(doctor.user_id, {
        profileImageUrl: req.uploadedFile.url,
        profileImagePublicId: req.uploadedFile.publicId
      });
    }

    const updated = await Doctor.update(req.params.id, doctorData);
    await auditService.log(req, 'update', 'doctor', req.params.id, 'Doctor profile updated');

    return sendSuccess(res, updated, 'Doctor updated successfully');
  },

  async getMyProfile(req, res) {
    const doctor = await Doctor.findByUserId(req.user.userId);
    if (!doctor) return sendError(res, 'Doctor profile not found', 404);
    return sendSuccess(res, doctor);
  },

  async getSchedule(req, res) {
    const doctorId = req.params.id || req.user.doctorId;
    const schedule = await Doctor.getSchedule(doctorId);
    return sendSuccess(res, schedule);
  },

  async updateSchedule(req, res) {
    const { schedule } = req.body; // Array of { dayOfWeek, startTime, endTime, slotDuration, maxPatients, isActive }
    const doctorId = req.user.doctorId;

    const results = [];
    for (const day of schedule) {
      if (day.isActive === false) {
        await Doctor.deleteScheduleDay(doctorId, day.dayOfWeek);
        results.push({ day: day.dayOfWeek, status: 'removed' });
      } else {
        const updated = await Doctor.upsertSchedule(doctorId, day.dayOfWeek, day);
        results.push(updated);
      }
    }

    await auditService.log(req, 'update', 'schedule', doctorId, 'Doctor schedule updated');
    return sendSuccess(res, results, 'Schedule updated successfully');
  },

  async getDashboard(req, res) {
    const stats = await Doctor.getDashboardStats(req.user.doctorId);
    return sendSuccess(res, stats);
  },

  async getPatients(req, res) {
    const { page, limit } = getPagination(req.query);
    const { query: db } = require('../config/database');

    const result = await db(
      `SELECT DISTINCT p.*, u.first_name, u.last_name, u.email, u.phone,
        MAX(a.appointment_date) as last_visit
       FROM patients p
       JOIN users u ON p.user_id = u.id
       JOIN appointments a ON p.id = a.patient_id
       WHERE a.doctor_id = $1 AND a.status = 'completed'
       GROUP BY p.id, u.first_name, u.last_name, u.email, u.phone
       ORDER BY last_visit DESC
       LIMIT $2 OFFSET $3`,
      [req.user.doctorId, limit, (page - 1) * limit]
    );

    return sendSuccess(res, result.rows);
  }
};

module.exports = doctorController;
