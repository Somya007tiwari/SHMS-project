const { query, transaction } = require("../config/database");
const bcrypt = require("bcryptjs");

class Doctor {
  static async findById(id) {
    const result = await query(
      `SELECT d.id, d.user_id, d.department_id, d.specialization, d.qualification,
              d.experience_years, d.registration_number, d.consultation_fee, d.bio,
              d.languages_spoken, d.is_available, d.rating, d.total_reviews, d.room_number, d.signature_url,
              d.created_at, d.updated_at,
              u.first_name, u.last_name, u.email, u.phone, u.profile_image_url, u.profile_image_public_id, u.is_active,
              dep.name as department_name, dep.description as department_description
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dep ON d.department_id = dep.id
       WHERE d.id = $1`,
      [id],
    );
    return result.rows[0] || null;
  }

  static async findByUserId(userId) {
    const result = await query(
      `SELECT d.id, d.user_id, d.department_id, d.specialization, d.qualification,
              d.experience_years, d.registration_number, d.consultation_fee, d.bio,
              d.languages_spoken, d.is_available, d.rating, d.total_reviews, d.room_number, d.signature_url,
              d.created_at, d.updated_at,
              u.first_name, u.last_name, u.email, u.phone, u.profile_image_url, u.profile_image_public_id, u.is_active,
              dep.name as department_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dep ON d.department_id = dep.id
       WHERE d.user_id = $1`,
      [userId],
    );
    return result.rows[0] || null;
  }

  static async updateSignature(doctorId, signatureUrl) {
    try {
      const result = await query(
        `UPDATE doctors SET signature_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, signature_url`,
        [signatureUrl, doctorId]
      );
      return result.rows[0];
    } catch (err) {
      if (err.message?.includes('column "signature_url" does not exist')) {
        throw new Error('Doctor signature column missing. Run Phase 14.1 migration.');
      }
      throw err;
    }
  }

  static async createWithUser({ userData, doctorData, uploadedFile }) {
    return transaction(async (client) => {
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(userData.password, salt);

      // Create user row
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, profile_image_url, profile_image_public_id)
         VALUES ($1, $2, 'doctor', $3, $4, $5, $6, $7)
         RETURNING id, email, role, first_name, last_name, phone, profile_image_url, created_at`,
        [
          userData.email.toLowerCase(),
          passwordHash,
          userData.firstName,
          userData.lastName,
          userData.phone || null,
          uploadedFile ? uploadedFile.url : null,
          uploadedFile ? uploadedFile.publicId : null,
        ]
      );
      const user = userRes.rows[0];

      // Parse numeric fields safely
      const expYears =
        doctorData.experienceYears !== undefined && doctorData.experienceYears !== ""
          ? parseInt(doctorData.experienceYears, 10)
          : 0;
      const fee =
        doctorData.consultationFee !== undefined && doctorData.consultationFee !== ""
          ? parseFloat(doctorData.consultationFee)
          : 0;

      // Create doctor row
      const doctorRes = await client.query(
        `INSERT INTO doctors (user_id, department_id, specialization, qualification,
          experience_years, registration_number, consultation_fee, bio, languages_spoken, room_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          user.id,
          doctorData.departmentId || null,
          doctorData.specialization,
          doctorData.qualification || null,
          isNaN(expYears) ? 0 : expYears,
          doctorData.registrationNumber || null,
          isNaN(fee) ? 0 : fee,
          doctorData.bio || null,
          doctorData.languagesSpoken || [],
          doctorData.roomNumber || null,
        ]
      );
      const doctor = doctorRes.rows[0];

      return { user, doctor };
    });
  }

  static async create(userId, data) {
    const expYears =
      data.experienceYears !== undefined && data.experienceYears !== ""
        ? parseInt(data.experienceYears, 10)
        : 0;
    const fee =
      data.consultationFee !== undefined && data.consultationFee !== ""
        ? parseFloat(data.consultationFee)
        : 0;

    const result = await query(
      `INSERT INTO doctors (user_id, department_id, specialization, qualification,
        experience_years, registration_number, consultation_fee, bio, languages_spoken, room_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        data.departmentId || null,
        data.specialization,
        data.qualification || null,
        isNaN(expYears) ? 0 : expYears,
        data.registrationNumber || null,
        isNaN(fee) ? 0 : fee,
        data.bio || null,
        data.languagesSpoken || [],
        data.roomNumber || null,
      ],
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const expYears =
      data.experienceYears !== undefined
        ? data.experienceYears !== ""
          ? parseInt(data.experienceYears, 10)
          : 0
        : undefined;

    const fee =
      data.consultationFee !== undefined
        ? data.consultationFee !== ""
          ? parseFloat(data.consultationFee)
          : 0
        : undefined;

    const allowedFields = {
      department_id: data.departmentId !== undefined ? (data.departmentId || null) : undefined,
      specialization: data.specialization !== undefined ? data.specialization : undefined,
      qualification: data.qualification !== undefined ? (data.qualification || null) : undefined,
      experience_years: expYears,
      consultation_fee: fee,
      bio: data.bio !== undefined ? (data.bio || null) : undefined,
      languages_spoken: data.languagesSpoken !== undefined ? data.languagesSpoken : undefined,
      is_available: data.isAvailable !== undefined ? (data.isAvailable === true || data.isAvailable === "true") : undefined,
      room_number: data.roomNumber !== undefined ? (data.roomNumber || null) : undefined,
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
      `UPDATE doctors SET ${fields.join(", ")} WHERE id = $${paramCount} RETURNING *`,
      values,
    );
    return result.rows[0];
  }

  static async getAll({
    page = 1,
    limit = 10,
    departmentId,
    search,
    isAvailable,
    sortBy,
  }) {
    let whereClause = "WHERE u.is_active = true";
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

    let orderByClause = "ORDER BY u.first_name ASC, u.last_name ASC";
    if (sortBy === "rating") {
      orderByClause = "ORDER BY d.rating DESC, d.total_reviews DESC, u.first_name ASC";
    } else if (sortBy === "experience") {
      orderByClause = "ORDER BY d.experience_years DESC, u.first_name ASC";
    } else if (sortBy === "fee_asc") {
      orderByClause = "ORDER BY d.consultation_fee ASC, u.first_name ASC";
    }

    const offset = (page - 1) * limit;
    const countResult = await query(
      `SELECT COUNT(*) FROM doctors d JOIN users u ON d.user_id = u.id ${whereClause}`,
      params,
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT d.id, d.user_id, d.specialization, d.qualification, d.experience_years, d.consultation_fee,
              d.rating, d.total_reviews, d.is_available, d.department_id, d.room_number, d.bio,
              u.first_name, u.last_name, u.email, u.phone, u.profile_image_url, u.profile_image_public_id,
              dep.name as department_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dep ON d.department_id = dep.id
       ${whereClause}
       ${orderByClause}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params,
    );

    return { doctors: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async getSchedule(doctorId) {
    const result = await query(
      "SELECT * FROM schedules WHERE doctor_id = $1 ORDER BY day_of_week",
      [doctorId],
    );
    return result.rows;
  }

  static async upsertSchedule(doctorId, dayOfWeek, data) {
    const isActive = data.isActive !== undefined ? (data.isActive === true || data.isActive === 'true') : true;
    const result = await query(
      `INSERT INTO schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients, break_start_time, break_end_time, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         slot_duration_minutes = EXCLUDED.slot_duration_minutes,
         max_patients = EXCLUDED.max_patients,
         break_start_time = EXCLUDED.break_start_time,
         break_end_time = EXCLUDED.break_end_time,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [
        doctorId,
        dayOfWeek.toLowerCase(),
        data.startTime || '09:00',
        data.endTime || '17:00',
        data.slotDuration || data.slotDurationMinutes || 30,
        data.maxPatients || 10,
        data.breakStartTime || data.break_start_time || null,
        data.breakEndTime || data.break_end_time || null,
        isActive,
      ],
    );
    return result.rows[0];
  }

  static async deleteScheduleDay(doctorId, dayOfWeek) {
    await query(
      "UPDATE schedules SET is_active = false WHERE doctor_id = $1 AND day_of_week = $2",
      [doctorId, dayOfWeek.toLowerCase()],
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
      [doctorId],
    );
    return result.rows[0];
  }
}

module.exports = Doctor;
