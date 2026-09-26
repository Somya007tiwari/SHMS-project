const { query } = require('../config/database');

class Patient {
  static async findById(id) {
    const result = await query(
      `SELECT p.*, u.email, u.first_name, u.last_name, u.phone, u.profile_image_url, u.is_active
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByUserId(userId) {
    const result = await query(
      `SELECT p.*, u.email, u.first_name, u.last_name, u.phone, u.profile_image_url
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  static async create(userId, data = {}) {
    const result = await query(
      `INSERT INTO patients (user_id, date_of_birth, gender, blood_group, address, city, state,
        emergency_contact_name, emergency_contact_phone, allergies, chronic_conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId, data.dateOfBirth || null, data.gender || null, data.bloodGroup || null,
        data.address || null, data.city || null, data.state || null,
        data.emergencyContactName || null, data.emergencyContactPhone || null,
        data.allergies || [], data.chronicConditions || []
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = {
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      blood_group: data.bloodGroup,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      emergency_contact_name: data.emergencyContactName,
      emergency_contact_phone: data.emergencyContactPhone,
      allergies: data.allergies,
      chronic_conditions: data.chronicConditions,
      insurance_provider: data.insuranceProvider,
      insurance_policy_number: data.insurancePolicyNumber
    };

    for (const [key, value] of Object.entries(allowedFields)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return null;
    values.push(id);

    const result = await query(
      `UPDATE patients SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async getAll({ page = 1, limit = 10, search }) {
    let whereClause = 'WHERE u.is_active = true AND u.role = \'patient\'';
    const params = [];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const offset = (page - 1) * limit;
    const countResult = await query(
      `SELECT COUNT(*) FROM patients p JOIN users u ON p.user_id = u.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT p.id, p.date_of_birth, p.gender, p.blood_group, p.city, p.allergies,
              p.chronic_conditions, p.created_at,
              u.first_name, u.last_name, u.email, u.phone, u.profile_image_url
       FROM patients p
       JOIN users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY u.first_name ASC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { patients: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async getMedicalHistory(patientId) {
    const records = await query(
      `SELECT mr.*, d.id as doctor_id,
              u.first_name || ' ' || u.last_name as doctor_name,
              dep.name as department
       FROM medical_records mr
       JOIN doctors d ON mr.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dep ON d.department_id = dep.id
       WHERE mr.patient_id = $1
       ORDER BY mr.visit_date DESC`,
      [patientId]
    );
    return records.rows;
  }

  static async getDashboardStats(patientId) {
    const result = await query(
      `SELECT
        COUNT(CASE WHEN a.status IN ('pending', 'approved') AND a.appointment_date >= CURRENT_DATE THEN 1 END) as upcoming_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(DISTINCT pr.id) as total_prescriptions,
        COUNT(DISTINCT mr.id) as total_records
       FROM patients p
       LEFT JOIN appointments a ON p.id = a.patient_id
       LEFT JOIN prescriptions pr ON p.id = pr.patient_id
       LEFT JOIN medical_records mr ON p.id = mr.patient_id
       WHERE p.id = $1`,
      [patientId]
    );
    return result.rows[0];
  }
}

module.exports = Patient;
