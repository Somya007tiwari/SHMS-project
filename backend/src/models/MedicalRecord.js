const { query } = require('../config/database');

class MedicalRecord {
  static async create(data) {
    const result = await query(
      `INSERT INTO medical_records
        (patient_id, doctor_id, appointment_id, visit_date, symptoms, diagnosis, doctor_notes, follow_up_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.patientId,
        data.doctorId,
        data.appointmentId || null,
        data.visitDate || new Date().toISOString().substring(0, 10),
        data.symptoms || null,
        data.diagnosis,
        data.doctorNotes || null,
        data.followUpDate || null
      ]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT mr.*,
              pu.id as patient_user_id,
              pu.first_name || ' ' || pu.last_name as patient_name,
              pu.email as patient_email,
              du.id as doctor_user_id,
              du.first_name || ' ' || du.last_name as doctor_name,
              du.email as doctor_email,
              doc.specialization,
              dep.name as department_name
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON mr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON doc.department_id = dep.id
       WHERE mr.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async getByPatientId(patientId, { page = 1, limit = 10, search } = {}) {
    const params = [patientId];
    let paramCount = 2;
    let whereClause = 'WHERE mr.patient_id = $1';

    if (search && search.trim()) {
      whereClause += ` AND (mr.diagnosis ILIKE $${paramCount} OR mr.symptoms ILIKE $${paramCount} OR du.first_name ILIKE $${paramCount} OR du.last_name ILIKE $${paramCount})`;
      params.push(`%${search.trim()}%`);
      paramCount++;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM medical_records mr 
       JOIN doctors doc ON mr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const result = await query(
      `SELECT mr.*,
              du.first_name || ' ' || du.last_name as doctor_name,
              doc.specialization,
              dep.name as department_name
       FROM medical_records mr
       JOIN doctors doc ON mr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON doc.department_id = dep.id
       ${whereClause}
       ORDER BY mr.visit_date DESC, mr.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { records: result.rows, total };
  }

  static async getAll({ page = 1, limit = 10, search, doctorId, patientId } = {}) {
    const params = [];
    let paramCount = 1;
    const whereConditions = [];

    if (patientId) {
      whereConditions.push(`mr.patient_id = $${paramCount++}`);
      params.push(patientId);
    }
    if (doctorId) {
      whereConditions.push(`mr.doctor_id = $${paramCount++}`);
      params.push(doctorId);
    }
    if (search && search.trim()) {
      whereConditions.push(`(mr.diagnosis ILIKE $${paramCount} OR mr.symptoms ILIKE $${paramCount} OR pu.first_name ILIKE $${paramCount} OR pu.last_name ILIKE $${paramCount} OR du.first_name ILIKE $${paramCount} OR du.last_name ILIKE $${paramCount})`);
      params.push(`%${search.trim()}%`);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) 
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON mr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const result = await query(
      `SELECT mr.*,
              pu.first_name || ' ' || pu.last_name as patient_name,
              du.first_name || ' ' || du.last_name as doctor_name,
              doc.specialization,
              dep.name as department_name
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON mr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON doc.department_id = dep.id
       ${whereClause}
       ORDER BY mr.visit_date DESC, mr.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { records: result.rows, total };
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = {
      visit_date: data.visitDate,
      symptoms: data.symptoms,
      diagnosis: data.diagnosis,
      doctor_notes: data.doctorNotes,
      follow_up_date: data.followUpDate
    };

    for (const [key, value] of Object.entries(allowedFields)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE medical_records SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(`DELETE FROM medical_records WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
  }

  // Doctor-Patient relationship check
  static async hasDoctorPatientRelationship(doctorId, patientId) {
    const result = await query(
      `SELECT 1 FROM appointments
       WHERE doctor_id = $1 AND patient_id = $2
         AND status IN ('pending', 'approved', 'completed', 'needs_reschedule')
       LIMIT 1`,
      [doctorId, patientId]
    );
    return result.rows.length > 0;
  }

  // Files
  static async addFile({ recordId, originalName, storedName, mimeType, sizeBytes, uploadedBy }) {
    const result = await query(
      `INSERT INTO medical_record_files
        (record_id, original_name, stored_name, mime_type, size_bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [recordId, originalName, storedName, mimeType, sizeBytes, uploadedBy]
    );
    return result.rows[0];
  }

  static async getFilesByRecordId(recordId) {
    const result = await query(
      `SELECT * FROM medical_record_files WHERE record_id = $1 ORDER BY created_at DESC`,
      [recordId]
    );
    return result.rows;
  }

  static async getFileById(fileId) {
    const result = await query(
      `SELECT mrf.*, mr.patient_id, mr.doctor_id
       FROM medical_record_files mrf
       JOIN medical_records mr ON mrf.record_id = mr.id
       WHERE mrf.id = $1`,
      [fileId]
    );
    return result.rows[0] || null;
  }

  static async deleteFile(fileId) {
    const result = await query(`DELETE FROM medical_record_files WHERE id = $1 RETURNING *`, [fileId]);
    return result.rows[0] || null;
  }

  // Access Logging
  static async logAccess(userId, recordId, action) {
    try {
      await query(
        `INSERT INTO record_access_logs (user_id, record_id, action) VALUES ($1, $2, $3)`,
        [userId, recordId, action]
      );
    } catch (err) {
      console.error('Failed to log record access:', err.message);
    }
  }
}

module.exports = MedicalRecord;
