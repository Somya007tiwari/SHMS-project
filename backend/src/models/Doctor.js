const { query } = require('../config/database');

class Doctor {
  static async findById(id) {
    const result = await query(
      `SELECT d.*, u.email, u.first_name, u.last_name, u.phone, u.profile_image_url, u.is_active,
              dep.name as department_name, dep.description as department_description
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dep ON d.department_id = dep.id
       WHERE d.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByUserId(userId) {
    const result = await query(
      `SELECT d.*, u.email, u.first_name, u.last_name, u.phone, u.profile_image_url,
              dep.name as department_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dep ON d.department_id = dep.id
       WHERE d.user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  static async create(userId, data) {
    const result = await query(
      `INSERT INTO doctors (user_id, department_id, specialization, qualification, 
        experience_years, registration_number, consultation_fee, bio, languages_spoken)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId, data.departmentId, data.specialization, data.qualification,
        data.experienceYears || 0, data.registrationNumber, data.consultationFee || 0,
        data.bio, data.languagesSpoken || []
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = {
      department_id: data.departmentId,
      specialization: data.specialization,
      qualification: data.qualification,
      experience_years: data.experienceYears,
      consultation_fee: data.consultationFee,
      bio: data.bio,
      languages_spoken: data.languagesSpoken,
      is_available: data.isAvailable
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
      `UPDATE doctors SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async getAll({ page = 1, limit = 10, departmentId, search, isAvailable }) {
    let whereClause = 'WHERE u.is_active = true';
    const params = [];
    let paramCount = 1;

    if (departmentId) {
      whereClause += ` AND d.department_id = $${paramCount++}`;
      params.push(departmentId);
    }

    if (isAvailable !== undefined) {
      whereClause += ` AND d.is_available = $${paramCount++}`;
      params.push(isAvailable);
    }

    if (search) {
      whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR d.specialization ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const offset = (page - 1) * limit;
    const countResult = await query(
      `SELECT COUNT(*) FROM doctors d JOIN users u ON d.user_id = u.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT d.id, d.specialization, d.qualification, d.experience_years, d.consultation_fee,
              d.rating, d.total_reviews, d.is_available, d.department_id,
              u.first_name, u.last_name, u.email, u.phone, u.profile_image_url,
              dep.name as department_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dep ON d.department_id = dep.id
       ${whereClause}
       ORDER BY d.rating DESC, u.first_name ASC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { doctors: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async getSchedule(doctorId) {
    const result = await query(
      'SELECT * FROM schedules WHERE doctor_id = $1 AND is_active = true ORDER BY day_of_week',
      [doctorId]
    );
    return result.rows;
  }

  static async upsertSchedule(doctorId, dayOfWeek, data) {
    const result = await query(
      `INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         slot_duration_minutes = EXCLUDED.slot_duration_minutes,
         max_patients = EXCLUDED.max_patients,
         is_active = true
       RETURNING *`,
      [doctorId, dayOfWeek, data.startTime, data.endTime, data.slotDuration || 30, data.maxPatients || 10]
    );
    return result.rows[0];
  }

  static async deleteScheduleDay(doctorId, dayOfWeek) {
    await query(
      'UPDATE schedules SET is_active = false WHERE doctor_id = $1 AND day_of_week = $2',
      [doctorId, dayOfWeek]
    );
  }

  static async getDashboardStats(doctorId) {
    const result = await query(
      `SELECT
        COUNT(CASE WHEN DATE(a.appointment_date) = CURRENT_DATE THEN 1 END) as today_appointments,
        COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_consultations,
        COUNT(DISTINCT a.patient_id) as total_patients
       FROM appointments a
       WHERE a.doctor_id = $1`,
      [doctorId]
    );
    return result.rows[0];
  }
}

module.exports = Doctor;
