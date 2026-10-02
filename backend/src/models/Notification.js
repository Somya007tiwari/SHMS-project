const { query } = require('../config/database');

class Notification {
  static async create({ userId, type, title, message, link = null, data = {} }) {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, link, data)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, type, title, message, link, JSON.stringify(data)]
    );
    return result.rows[0];
  }

  static async getByUser(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE user_id = $1';
    if (unreadOnly) whereClause += ' AND is_read = false';

    const countResult = await query(`SELECT COUNT(*) FROM notifications ${whereClause}`, [userId]);
    const result = await query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const unreadCountRes = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return {
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count),
      unreadCount: parseInt(unreadCountRes.rows[0].count)
    };
  }

  static async getUnreadCount(userId) {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async markAsRead(id, userId) {
    const result = await query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }

  static async markAsUnread(id, userId) {
    const result = await query(
      'UPDATE notifications SET is_read = false, read_at = NULL WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    await query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  }

  static async delete(id, userId) {
    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0] || null;
  }
}

class AuditLog {
  static async create({ userId, action, entityType, entityId, description, ipAddress, userAgent, oldValues, newValues }) {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId, action, entityType, entityId, description, ipAddress, userAgent,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null
      ]
    );
  }

  static async getAll({ page = 1, limit = 50, userId, action, fromDate, toDate }) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (userId) { whereClause += ` AND al.user_id = $${paramCount++}`; params.push(userId); }
    if (action) { whereClause += ` AND al.action = $${paramCount++}`; params.push(action); }
    if (fromDate) { whereClause += ` AND al.created_at >= $${paramCount++}`; params.push(fromDate); }
    if (toDate) { whereClause += ` AND al.created_at <= $${paramCount++}`; params.push(toDate); }

    const offset = (page - 1) * limit;
    const countResult = await query(`SELECT COUNT(*) FROM audit_logs al ${whereClause}`, params);

    params.push(limit, offset);
    const result = await query(
      `SELECT al.*, u.first_name || ' ' || u.last_name as user_name, u.role as user_role, u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { logs: result.rows, total: parseInt(countResult.rows[0].count) };
  }
}

module.exports = { Notification, AuditLog };
