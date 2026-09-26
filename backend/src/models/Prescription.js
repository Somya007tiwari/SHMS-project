const { query } = require('../config/database');

class Prescription {
  static async create(data) {
    const result = await query(
      `INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, medical_record_id, notes, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.appointmentId, data.patientId, data.doctorId, data.medicalRecordId, data.notes, data.validUntil]
    );
    return result.rows[0];
  }

  static async addMedicine(prescriptionId, medicine) {
    const result = await query(
      `INSERT INTO medicines (prescription_id, name, dosage, frequency, duration, instructions, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [prescriptionId, medicine.name, medicine.dosage, medicine.frequency,
       medicine.duration, medicine.instructions, medicine.quantity]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const prescription = await query(
      `SELECT pr.*,
        pu.first_name || ' ' || pu.last_name as patient_name,
        pu.email as patient_email, pu.phone as patient_phone,
        du.first_name || ' ' || du.last_name as doctor_name,
        doc.specialization, doc.qualification, doc.registration_number,
        dep.name as department_name,
        pa.date_of_birth, pa.gender, pa.blood_group, pa.allergies
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON pr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       LEFT JOIN departments dep ON doc.department_id = dep.id
       JOIN patients pa ON pr.patient_id = pa.id
       WHERE pr.id = $1`,
      [id]
    );

    if (!prescription.rows[0]) return null;

    const medicines = await query(
      'SELECT * FROM medicines WHERE prescription_id = $1 ORDER BY created_at ASC',
      [id]
    );

    return { ...prescription.rows[0], medicines: medicines.rows };
  }

  static async getByPatient(patientId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const countResult = await query('SELECT COUNT(*) FROM prescriptions WHERE patient_id = $1', [patientId]);

    const result = await query(
      `SELECT pr.*, 
        du.first_name || ' ' || du.last_name as doctor_name,
        doc.specialization,
        (SELECT COUNT(*) FROM medicines m WHERE m.prescription_id = pr.id) as medicine_count
       FROM prescriptions pr
       JOIN doctors doc ON pr.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       WHERE pr.patient_id = $1
       ORDER BY pr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [patientId, limit, offset]
    );

    return { prescriptions: result.rows, total: parseInt(countResult.rows[0].count) };
  }

  static async getByDoctor(doctorId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT pr.*,
        pu.first_name || ' ' || pu.last_name as patient_name,
        (SELECT COUNT(*) FROM medicines m WHERE m.prescription_id = pr.id) as medicine_count
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       WHERE pr.doctor_id = $1
       ORDER BY pr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [doctorId, limit, offset]
    );
    return result.rows;
  }

  static async updatePdfUrl(id, pdfUrl) {
    await query('UPDATE prescriptions SET pdf_url = $1 WHERE id = $2', [pdfUrl, id]);
  }
}

module.exports = Prescription;
