const { query } = require('../config/database');

class PatientHealthProfile {
  static async getByPatientId(patientId) {
    const result = await query(
      `SELECT php.*, p.blood_group as base_blood_group, p.allergies as base_allergies, 
              p.chronic_conditions as base_chronic_conditions, p.emergency_contact_name as base_emergency_name,
              p.emergency_contact_phone as base_emergency_phone
       FROM patients p
       LEFT JOIN patient_health_profiles php ON p.id = php.patient_id
       WHERE p.id = $1`,
      [patientId]
    );

    const row = result.rows[0];
    if (!row) return null;

    const formatArrayOrText = (val) => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(', ');
      return String(val);
    };

    return {
      patient_id: patientId,
      blood_group: row.blood_group || row.base_blood_group || null,
      allergies: row.allergies || formatArrayOrText(row.base_allergies),
      chronic_conditions: row.chronic_conditions || formatArrayOrText(row.base_chronic_conditions),
      emergency_contact_name: row.emergency_contact_name || row.base_emergency_name || '',
      emergency_contact_phone: row.emergency_contact_phone || row.base_emergency_phone || '',
      updated_at: row.updated_at || new Date()
    };
  }

  static async upsert(patientId, data) {
    const { bloodGroup, allergies, chronicConditions, emergencyContactName, emergencyContactPhone } = data;

    const result = await query(
      `INSERT INTO patient_health_profiles 
        (patient_id, blood_group, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (patient_id) DO UPDATE SET
        blood_group = EXCLUDED.blood_group,
        allergies = EXCLUDED.allergies,
        chronic_conditions = EXCLUDED.chronic_conditions,
        emergency_contact_name = EXCLUDED.emergency_contact_name,
        emergency_contact_phone = EXCLUDED.emergency_contact_phone,
        updated_at = NOW()
       RETURNING *`,
      [
        patientId,
        bloodGroup || null,
        allergies || null,
        chronicConditions || null,
        emergencyContactName || null,
        emergencyContactPhone || null
      ]
    );
    return result.rows[0];
  }
}

module.exports = PatientHealthProfile;
