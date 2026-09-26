const Patient = require('../models/Patient');
const User = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const auditService = require('../services/auditService');

const patientController = {
  async getAll(req, res) {
    const { page, limit } = getPagination(req.query);
    const { search } = req.query;
    const data = await Patient.getAll({ page, limit, search });
    return sendPaginated(res, data.patients, buildPaginationMeta(data.total, page, limit));
  },

  async getById(req, res) {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return sendError(res, 'Patient not found', 404);
    return sendSuccess(res, patient);
  },

  async getMyProfile(req, res) {
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);
    return sendSuccess(res, patient);
  },

  async updateProfile(req, res) {
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    const updated = await Patient.update(patient.id, req.body);
    await auditService.log(req, 'update', 'patient', patient.id, 'Patient profile updated');
    return sendSuccess(res, updated, 'Profile updated successfully');
  },

  async getMedicalHistory(req, res) {
    const patientId = req.params.id || (await Patient.findByUserId(req.user.userId))?.id;
    if (!patientId) return sendError(res, 'Patient not found', 404);

    const history = await Patient.getMedicalHistory(patientId);
    return sendSuccess(res, history);
  },

  async getDashboard(req, res) {
    const patient = await Patient.findByUserId(req.user.userId);
    if (!patient) return sendError(res, 'Patient profile not found', 404);

    const stats = await Patient.getDashboardStats(patient.id);
    return sendSuccess(res, stats);
  },

  async deactivate(req, res) {
    await require('../config/database').query(
      'UPDATE users SET is_active = false WHERE id = (SELECT user_id FROM patients WHERE id = $1)',
      [req.params.id]
    );
    await auditService.log(req, 'delete', 'patient', req.params.id, 'Patient account deactivated');
    return sendSuccess(res, null, 'Patient account deactivated');
  }
};

module.exports = patientController;
