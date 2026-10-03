const crypto = require('crypto');
const { query, transaction } = require('../config/database');

class Prescription {
  static async generatePrescriptionNumber() {
    const year = new Date().getFullYear();
    try {
      const seqRes = await query(`SELECT nextval('prescription_seq') as num`);
      const num = String(seqRes.rows[0].num).padStart(6, '0');
      return `RX-${year}-${num}`;
    } catch (err) {
      const rnd = Math.floor(100000 + Math.random() * 900000);
      return `RX-${year}-${rnd}`;
    }
  }

  static async checkAllergies(patientId, items = []) {
    const warnings = [];
    if (!patientId || !items.length) return warnings;

    const res = await query(
      `SELECT php.allergies as hp_allergies, p.allergies as base_allergies
       FROM patients p
       LEFT JOIN patient_health_profiles php ON p.id = php.patient_id
       WHERE p.id = $1`,
      [patientId]
    );

    const row = res.rows[0];
    if (!row) return warnings;

    let allergiesStr = '';
    if (row.hp_allergies) allergiesStr += ' ' + row.hp_allergies;
    if (row.base_allergies) {
      if (Array.isArray(row.base_allergies)) {
        allergiesStr += ' ' + row.base_allergies.join(' ');
      } else {
        allergiesStr += ' ' + row.base_allergies;
      }
    }

    allergiesStr = allergiesStr.toLowerCase().trim();
    if (!allergiesStr) return warnings;

    for (const item of items) {
      const medName = (item.medicineName || item.medicine_name || '').trim();
      if (!medName) continue;

      const medLower = medName.toLowerCase();

      // Check substring matches between allergy words and medicine name
      const allergyTokens = allergiesStr.split(/[\s,;]+/).filter(t => t.length >= 3);
      for (const token of allergyTokens) {
        if (medLower.includes(token) || token.includes(medLower)) {
          warnings.push(`Warning: Patient has a recorded allergy to "${token}" which matches medicine "${medName}".`);
          break;
        }
      }
    }

    return warnings;
  }

  static async createWithTransaction({ patientId, doctorId, appointmentId, medicalRecordId, diagnosis, advice, followUpDate, items }) {
    const prescriptionNumber = await this.generatePrescriptionNumber();
    const verificationCode = crypto.randomBytes(16).toString('hex');

    return transaction(async (client) => {
      let res;
      try {
        res = await client.query(
          `INSERT INTO prescriptions 
            (prescription_number, patient_id, doctor_id, appointment_id, medical_record_id, diagnosis, advice, follow_up_date, verification_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            prescriptionNumber,
            patientId,
            doctorId,
            appointmentId || null,
            medicalRecordId || null,
            diagnosis.trim(),
            advice ? advice.trim() : null,
            followUpDate || null,
            verificationCode
          ]
        );
      } catch (err) {
        if (err.message?.includes('column "verification_code" does not exist')) {
          res = await client.query(
            `INSERT INTO prescriptions 
              (prescription_number, patient_id, doctor_id, appointment_id, medical_record_id, diagnosis, advice, follow_up_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
              prescriptionNumber,
              patientId,
              doctorId,
              appointmentId || null,
              medicalRecordId || null,
              diagnosis.trim(),
              advice ? advice.trim() : null,
              followUpDate || null
            ]
          );
        } else {
          throw err;
        }
      }

      const prescription = res.rows[0];

      let sortOrder = 1;
      for (const item of items) {
        await client.query(
          `INSERT INTO prescription_items
            (prescription_id, medicine_name, dosage, frequency, duration_days, timing, instructions, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            prescription.id,
            item.medicineName.trim(),
            item.dosage.trim(),
            item.frequency.trim(),
            parseInt(item.durationDays, 10),
            item.timing ? item.timing.trim() : 'After food',
            item.instructions ? item.instructions.trim() : null,
            sortOrder++
          ]
        );
      }

      return prescription;
    });
  }

  static async updateWithTransaction(id, { diagnosis, advice, followUpDate, items }) {
    return transaction(async (client) => {
      const res = await client.query(
        `UPDATE prescriptions SET
          diagnosis = $1,
          advice = $2,
          follow_up_date = $3,
          updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [
          diagnosis.trim(),
          advice ? advice.trim() : null,
          followUpDate || null,
          id
        ]
      );

      const prescription = res.rows[0];

      // Replace items
      await client.query(`DELETE FROM prescription_items WHERE prescription_id = $1`, [id]);

      let sortOrder = 1;
      for (const item of items) {
        await client.query(
          `INSERT INTO prescription_items
            (prescription_id, medicine_name, dosage, frequency, duration_days, timing, instructions, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            item.medicineName.trim(),
            item.dosage.trim(),
            item.frequency.trim(),
            parseInt(item.durationDays, 10),
            item.timing ? item.timing.trim() : 'After food',
            item.instructions ? item.instructions.trim() : null,
            sortOrder++
          ]
        );
      }

      return prescription;
    });
  }

  static async findById(id) {
    const result = await query(
      `SELECT pr.*,
              pu.id as patient_user_id,
              pu.first_name || ' ' || pu.last_name as patient_name,
              pu.email as patient_email,
              pu.phone as patient_phone,
              p.date_of_birth, p.gender, p.blood_group,
              php.allergies as health_profile_allergies,
              du.id as doctor_user_id,
              du.first_name || ' ' || du.last_name as doctor_name,
              du.email as doctor_email,
              doc.specialization, doc.qualification, doc.registration_number, doc.room_number, doc.signature_url,
              dep.name as department_name
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       LEFT JOIN patient_health_profiles php ON p.id = php.patient_id
       JOIN doctors doc ON pr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON doc.department_id = dep.id
       WHERE pr.id = $1`,
      [id]
    );

    const prescription = result.rows[0];
    if (!prescription) return null;

    if (!prescription.verification_code) {
      try {
        const vCode = crypto.randomBytes(16).toString('hex');
        await query('UPDATE prescriptions SET verification_code = $1 WHERE id = $2', [vCode, id]);
        prescription.verification_code = vCode;
      } catch (err) {
        // Ignore if column doesn't exist yet
      }
    }

    const itemsRes = await query(
      `SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [id]
    );

    return {
      ...prescription,
      items: itemsRes.rows,
      allergies: prescription.health_profile_allergies || prescription.allergies || ''
    };
  }

  static async verifyCode(code) {
    if (!code || typeof code !== 'string' || code.trim().length < 16) {
      return { valid: false };
    }
    try {
      const result = await query(
        `SELECT pr.id, pr.prescription_number, pr.created_at as issue_date,
                du.first_name || ' ' || du.last_name as doctor_name,
                doc.specialization
         FROM prescriptions pr
         JOIN doctors doc ON pr.doctor_id = doc.id
         JOIN users du ON doc.user_id = du.id
         WHERE pr.verification_code = $1`,
        [code.trim()]
      );
      if (!result.rows.length) {
        return { valid: false };
      }
      const r = result.rows[0];
      return {
        valid: true,
        prescriptionNumber: r.prescription_number,
        issueDate: r.issue_date,
        doctorName: `Dr. ${r.doctor_name}`,
        specialization: r.specialization || 'General Practice',
        hospitalName: 'Smart Hospital Management System'
      };
    } catch (err) {
      if (err.message?.includes('column "verification_code" does not exist')) {
        throw new Error('Prescription verification column missing. Run Phase 14.1 migration.');
      }
      throw err;
    }
  }

  static async getByPatient(patientId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const countRes = await query(`SELECT COUNT(*) FROM prescriptions WHERE patient_id = $1`, [patientId]);
    const total = parseInt(countRes.rows[0].count, 10);

    const result = await query(
      `SELECT pr.*,
              du.first_name || ' ' || du.last_name as doctor_name,
              doc.specialization,
              dep.name as department_name,
              (SELECT COUNT(*) FROM prescription_items pi WHERE pi.prescription_id = pr.id) as item_count
       FROM prescriptions pr
       JOIN doctors doc ON pr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON doc.department_id = dep.id
       WHERE pr.patient_id = $1
       ORDER BY pr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [patientId, limit, offset]
    );

    return { prescriptions: result.rows, total };
  }

  static async getByDoctor(doctorId, { page = 1, limit = 10, search } = {}) {
    const params = [doctorId];
    let paramCount = 2;
    let whereClause = 'WHERE pr.doctor_id = $1';

    if (search && search.trim()) {
      whereClause += ` AND (pu.first_name ILIKE $${paramCount} OR pu.last_name ILIKE $${paramCount} OR pr.diagnosis ILIKE $${paramCount} OR pr.prescription_number ILIKE $${paramCount} OR EXISTS (SELECT 1 FROM prescription_items pi WHERE pi.prescription_id = pr.id AND pi.medicine_name ILIKE $${paramCount}))`;
      params.push(`%${search.trim()}%`);
      paramCount++;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const result = await query(
      `SELECT pr.*,
              pu.first_name || ' ' || pu.last_name as patient_name,
              (SELECT COUNT(*) FROM prescription_items pi WHERE pi.prescription_id = pr.id) as item_count
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       ${whereClause}
       ORDER BY pr.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { prescriptions: result.rows, total };
  }

  static async getAll({ page = 1, limit = 10, search } = {}) {
    const params = [];
    let paramCount = 1;
    let whereClause = '';

    if (search && search.trim()) {
      whereClause = `WHERE pu.first_name ILIKE $${paramCount} OR pu.last_name ILIKE $${paramCount} OR du.first_name ILIKE $${paramCount} OR du.last_name ILIKE $${paramCount} OR pr.diagnosis ILIKE $${paramCount} OR pr.prescription_number ILIKE $${paramCount} OR EXISTS (SELECT 1 FROM prescription_items pi WHERE pi.prescription_id = pr.id AND pi.medicine_name ILIKE $${paramCount})`;
      params.push(`%${search.trim()}%`);
      paramCount++;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON pr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const result = await query(
      `SELECT pr.*,
              pu.first_name || ' ' || pu.last_name as patient_name,
              du.first_name || ' ' || du.last_name as doctor_name,
              doc.specialization,
              (SELECT COUNT(*) FROM prescription_items pi WHERE pi.prescription_id = pr.id) as item_count
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON pr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       ${whereClause}
       ORDER BY pr.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    return { prescriptions: result.rows, total };
  }

  static async getMedicineSuggestions(q) {
    if (!q || !q.trim()) {
      const result = await query(
        `SELECT DISTINCT medicine_name FROM prescription_items ORDER BY medicine_name ASC LIMIT 10`
      );
      return result.rows.map(r => r.medicine_name);
    }

    const result = await query(
      `SELECT DISTINCT medicine_name FROM prescription_items 
       WHERE medicine_name ILIKE $1 
       ORDER BY medicine_name ASC 
       LIMIT 10`,
      [`%${q.trim()}%`]
    );
    return result.rows.map(r => r.medicine_name);
  }
}

module.exports = Prescription;
