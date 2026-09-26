const { query } = require('../config/database');

class Department {
  static async findAll({ includeInactive = false } = {}) {
    const whereClause = includeInactive ? '' : 'WHERE d.is_active = true';
    const result = await query(
      `SELECT d.*, 
        COUNT(DISTINCT doc.id) as doctor_count,
        u.first_name || ' ' || u.last_name as head_doctor_name
       FROM departments d
       LEFT JOIN doctors doc ON d.id = doc.department_id AND doc.id IS NOT NULL
       LEFT JOIN doctors hd ON d.head_doctor_id = hd.id
       LEFT JOIN users u ON hd.user_id = u.id
       ${whereClause}
       GROUP BY d.id, u.first_name, u.last_name
       ORDER BY d.name ASC`
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await query(
      `SELECT d.*,
        u.first_name || ' ' || u.last_name as head_doctor_name
       FROM departments d
       LEFT JOIN doctors hd ON d.head_doctor_id = hd.id
       LEFT JOIN users u ON hd.user_id = u.id
       WHERE d.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create({ name, description, icon }) {
    const result = await query(
      'INSERT INTO departments (name, description, icon) VALUES ($1, $2, $3) RETURNING *',
      [name, description, icon || 'stethoscope']
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const result = await query(
      `UPDATE departments SET name = COALESCE($1, name), description = COALESCE($2, description),
        icon = COALESCE($3, icon), head_doctor_id = $4, is_active = COALESCE($5, is_active)
       WHERE id = $6 RETURNING *`,
      [data.name, data.description, data.icon, data.headDoctorId, data.isActive, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await query('UPDATE departments SET is_active = false WHERE id = $1', [id]);
  }
}

module.exports = Department;
