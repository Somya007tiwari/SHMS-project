const { query } = require('../config/database');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');

const reportController = {
  async upload(req, res) {
    if (!req.uploadedFile) return sendError(res, 'No file uploaded', 400);

    const { patientId, doctorId, appointmentId, reportType, title, description } = req.body;

    const result = await query(
      `INSERT INTO reports (patient_id, doctor_id, appointment_id, report_type, title, description, 
        file_url, file_public_id, file_size, file_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        patientId || null, doctorId || null, appointmentId || null,
        reportType, title, description,
        req.uploadedFile.url, req.uploadedFile.publicId,
        req.uploadedFile.size, req.uploadedFile.type,
        req.user.userId
      ]
    );

    const report = result.rows[0];

    notificationService.reportUploaded({
      patientUserId: req.user.userId,
      reportTitle: title,
      reportId: report.id
    }).catch(console.error);

    await auditService.log(req, 'upload', 'report', report.id, `Report "${title}" uploaded`);
    return sendCreated(res, report, 'Report uploaded successfully');
  },

  async getMyReports(req, res) {
    const { page, limit, offset } = getPagination(req.query);
    const { reportType } = req.query;

    let whereClause = 'WHERE r.patient_id = (SELECT id FROM patients WHERE user_id = $1)';
    const params = [req.user.userId];
    let paramCount = 2;

    if (reportType) {
      whereClause += ` AND r.report_type = $${paramCount++}`;
      params.push(reportType);
    }

    const countResult = await query(`SELECT COUNT(*) FROM reports r ${whereClause}`, params);
    params.push(limit, offset);

    const result = await query(
      `SELECT r.*, u.first_name || ' ' || u.last_name as doctor_name
       FROM reports r
       LEFT JOIN doctors d ON r.doctor_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return sendPaginated(res, result.rows, buildPaginationMeta(countResult.rows[0].count, page, limit));
  },

  async getById(req, res) {
    const result = await query(
      `SELECT r.*, p.user_id as patient_user_id, d.user_id as doctor_user_id 
       FROM reports r
       LEFT JOIN patients p ON r.patient_id = p.id
       LEFT JOIN doctors d ON r.doctor_id = d.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    const report = result.rows[0];
    if (!report) return sendError(res, 'Report not found', 404);

    if (req.user.role === 'patient' && report.patient_user_id !== req.user.userId) {
      return sendError(res, 'Report not found', 404);
    }
    if (req.user.role === 'doctor' && report.doctor_user_id !== req.user.userId) {
      return sendError(res, 'Report not found', 404);
    }

    return sendSuccess(res, report);
  },

  async delete(req, res) {
    const result = await query('DELETE FROM reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows[0]) return sendError(res, 'Report not found', 404);
    await auditService.log(req, 'delete', 'report', req.params.id, 'Report deleted');
    return sendSuccess(res, null, 'Report deleted successfully');
  }
};

module.exports = reportController;
