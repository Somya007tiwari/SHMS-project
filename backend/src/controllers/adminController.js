const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { AuditLog } = require('../models/Notification');

const adminController = {
  async getDashboardStats(req, res) {
    const [
      userStats, appointmentStats, revenueStats, deptStats
    ] = await Promise.all([
      query(`
        SELECT
          COUNT(CASE WHEN role = 'patient' THEN 1 END) as total_patients,
          COUNT(CASE WHEN role = 'doctor' THEN 1 END) as total_doctors,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
        FROM users WHERE is_active = true
      `),
      query(`
        SELECT
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN DATE(appointment_date) = CURRENT_DATE THEN 1 END) as today
        FROM appointments
      `),
      query(`
        SELECT
          COALESCE(SUM(p.amount), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN p.payment_date >= NOW() - INTERVAL '30 days' THEN p.amount END), 0) as revenue_30d,
          COUNT(DISTINCT b.id) as total_invoices,
          COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_invoices
        FROM bills b
        LEFT JOIN payments p ON b.id = p.bill_id
      `),
      query(`
        SELECT dep.name, COUNT(DISTINCT a.id) as appointment_count,
          COUNT(DISTINCT doc.id) as doctor_count
        FROM departments dep
        LEFT JOIN doctors doc ON dep.id = doc.department_id
        LEFT JOIN appointments a ON doc.id = a.doctor_id
        WHERE dep.is_active = true
        GROUP BY dep.id, dep.name
        ORDER BY appointment_count DESC
        LIMIT 10
      `)
    ]);

    // Monthly trends
    const monthlyTrends = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', a.appointment_date), 'Mon YYYY') as month,
        DATE_TRUNC('month', a.appointment_date) as month_date,
        COUNT(*) as appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed
      FROM appointments a
      WHERE a.appointment_date >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', a.appointment_date)
      ORDER BY month_date ASC
    `);

    const revenueTrends = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', p.payment_date), 'Mon YYYY') as month,
        DATE_TRUNC('month', p.payment_date) as month_date,
        COALESCE(SUM(p.amount), 0) as revenue
      FROM payments p
      WHERE p.payment_date >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', p.payment_date)
      ORDER BY month_date ASC
    `);

    return sendSuccess(res, {
      users: userStats.rows[0],
      appointments: appointmentStats.rows[0],
      revenue: revenueStats.rows[0],
      departments: deptStats.rows,
      monthlyTrends: monthlyTrends.rows,
      revenueTrends: revenueTrends.rows
    });
  },

  async getActivityLogs(req, res) {
    const { page, limit } = getPagination(req.query);
    const { userId, action, fromDate, toDate } = req.query;

    const data = await AuditLog.getAll({ page, limit, userId, action, fromDate, toDate });
    return sendSuccess(res, {
      logs: data.logs,
      pagination: buildPaginationMeta(data.total, page, limit)
    });
  },

  async getSystemSettings(req, res) {
    const result = await query('SELECT key, value, description, is_public FROM system_settings ORDER BY key');
    return sendSuccess(res, result.rows);
  },

  async updateSystemSettings(req, res) {
    const { settings } = req.body; // Array of { key, value }
    for (const setting of settings) {
      await query(
        'UPDATE system_settings SET value = $1, updated_by = $2, updated_at = NOW() WHERE key = $3',
        [setting.value, req.user.userId, setting.key]
      );
    }
    return sendSuccess(res, null, 'Settings updated successfully');
  },

  async deactivateUser(req, res) {
    const { id } = req.params;
    await query('UPDATE users SET is_active = false WHERE id = $1', [id]);
    return sendSuccess(res, null, 'User deactivated successfully');
  },

  async activateUser(req, res) {
    const { id } = req.params;
    await query('UPDATE users SET is_active = true WHERE id = $1', [id]);
    return sendSuccess(res, null, 'User activated successfully');
  }
};

module.exports = adminController;
