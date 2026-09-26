const { query } = require('../config/database');

class Appointment {
  static async findById(id) {
    const result = await query(
      `SELECT a.*,
        pu.first_name || ' ' || pu.last_name as patient_name,
        pu.email as patient_email, pu.phone as patient_phone,
        pu.profile_image_url as patient_image,
        du.first_name || ' ' || du.last_name as doctor_name,
        du.email as doctor_email,
        du.profile_image_url as doctor_image,
        doc.specialization,
        dep.name as department_name,
        p.id as patient_profile_id,
        p.gender as patient_gender, p.blood_group as patient_blood_group,
        p.date_of_birth as patient_dob
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON a.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON a.department_id = dep.id
       WHERE a.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data) {
    const result = await query(
      `INSERT INTO appointments 
        (patient_id, doctor_id, department_id, appointment_date, appointment_time, reason, symptoms, consultation_fee, is_first_visit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.patientId, data.doctorId, data.departmentId,
        data.appointmentDate, data.appointmentTime,
        data.reason, data.symptoms, data.consultationFee,
        data.isFirstVisit !== false
      ]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status, additionalData = {}) {
    const result = await query(
      `UPDATE appointments SET status = $1, rejection_reason = $2, notes = $3
       WHERE id = $4 RETURNING *`,
      [status, additionalData.rejectionReason || null, additionalData.notes || null, id]
    );
    return result.rows[0];
  }

  static async checkSlotAvailability(doctorId, date, time) {
    const result = await query(
      `SELECT COUNT(*) as count FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
       AND status NOT IN ('rejected', 'cancelled')`,
      [doctorId, date, time]
    );
    return parseInt(result.rows[0].count) === 0;
  }

  static async getBookedSlots(doctorId, date) {
    const result = await query(
      `SELECT appointment_time FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2
       AND status NOT IN ('rejected', 'cancelled')`,
      [doctorId, date]
    );
    return result.rows.map(r => r.appointment_time.substring(0, 5));
  }

  static async getByPatient(patientId, { page = 1, limit = 10, status }) {
    let whereClause = 'WHERE a.patient_id = $1';
    const params = [patientId];
    let paramCount = 2;

    if (status) {
      whereClause += ` AND a.status = $${paramCount++}`;
      params.push(status);
    }

    const offset = (page - 1) * limit;
    const countResult = await query(
      `SELECT COUNT(*) FROM appointments a ${whereClause}`, params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT a.*, 
        du.first_name || ' ' || du.last_name as doctor_name,
        du.profile_image_url as doctor_image,
        doc.specialization,
        dep.name as department_name
       FROM appointments a
       JOIN doctors doc ON a.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON a.department_id = dep.id
       ${whereClause}
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { appointments: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async getByDoctor(doctorId, { page = 1, limit = 10, status, date }) {
    let whereClause = 'WHERE a.doctor_id = $1';
    const params = [doctorId];
    let paramCount = 2;

    if (status) {
      whereClause += ` AND a.status = $${paramCount++}`;
      params.push(status);
    }
    if (date) {
      whereClause += ` AND a.appointment_date = $${paramCount++}`;
      params.push(date);
    }

    const offset = (page - 1) * limit;
    const countResult = await query(
      `SELECT COUNT(*) FROM appointments a ${whereClause}`, params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT a.*,
        pu.first_name || ' ' || pu.last_name as patient_name,
        pu.phone as patient_phone, pu.profile_image_url as patient_image,
        p.blood_group, p.gender, p.date_of_birth
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       ${whereClause}
       ORDER BY a.appointment_date ASC, a.appointment_time ASC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { appointments: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async getAll({ page = 1, limit = 10, status, doctorId, patientId, fromDate, toDate }) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) { whereClause += ` AND a.status = $${paramCount++}`; params.push(status); }
    if (doctorId) { whereClause += ` AND a.doctor_id = $${paramCount++}`; params.push(doctorId); }
    if (patientId) { whereClause += ` AND a.patient_id = $${paramCount++}`; params.push(patientId); }
    if (fromDate) { whereClause += ` AND a.appointment_date >= $${paramCount++}`; params.push(fromDate); }
    if (toDate) { whereClause += ` AND a.appointment_date <= $${paramCount++}`; params.push(toDate); }

    const offset = (page - 1) * limit;
    const countResult = await query(`SELECT COUNT(*) FROM appointments a ${whereClause}`, params);

    params.push(limit, offset);
    const result = await query(
      `SELECT a.*,
        pu.first_name || ' ' || pu.last_name as patient_name,
        du.first_name || ' ' || du.last_name as doctor_name,
        dep.name as department_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON a.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON a.department_id = dep.id
       ${whereClause}
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { appointments: result.rows, total: parseInt(countResult.rows[0].count) };
  }
}

module.exports = Appointment;
