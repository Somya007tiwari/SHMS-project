const { query, transaction } = require('../config/database');
const Patient = require('./Patient');
const PatientHealthProfile = require('./PatientHealthProfile');

class Family {
  static async getDependents(guardianUserId) {
    try {
      const guardian = await Patient.findByUserId(guardianUserId);
      if (!guardian) return [];

      const result = await query(
        `SELECT pg.id as guardian_link_id, pg.relation, pg.created_at as linked_at,
                p.id as patient_id, p.user_id, p.date_of_birth, p.gender, p.blood_group,
                p.allergies, p.chronic_conditions, p.is_dependent,
                u.first_name, u.last_name, u.email, u.phone, u.profile_image_url
         FROM patient_guardians pg
         JOIN patients p ON pg.dependent_patient_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE pg.guardian_patient_id = $1 AND u.is_active = true
         ORDER BY pg.created_at ASC`,
        [guardian.id]
      );
      return result.rows;
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Family management unavailable: Database table missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async countDependents(guardianPatientId) {
    const result = await query(
      `SELECT COUNT(*) FROM patient_guardians pg
       JOIN patients p ON pg.dependent_patient_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE pg.guardian_patient_id = $1 AND u.is_active = true`,
      [guardianPatientId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  static async createDependent(guardianUserId, data) {
    try {
      const { firstName, lastName, relation, dateOfBirth, gender, bloodGroup, allergies, chronicConditions } = data;

      // Accept both arrays and comma-separated strings; Postgres text[] needs a real array
      const toArray = (v) => {
        if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
        if (typeof v === 'string' && v.trim()) return v.split(',').map((s) => s.trim()).filter(Boolean);
        return [];
      };
      const allergyArr = toArray(allergies);
      const conditionArr = toArray(chronicConditions);

      const guardian = await Patient.findByUserId(guardianUserId);
      if (!guardian) {
        const err = new Error('Guardian patient profile not found');
        err.statusCode = 404;
        throw err;
      }

      // 5 dependents limit
      const currentCount = await this.countDependents(guardian.id);
      if (currentCount >= 5) {
        const err = new Error('Maximum limit of 5 dependents per guardian reached.');
        err.statusCode = 400;
        throw err;
      }

      return await transaction(async (client) => {
        // 1. Create User row (no password_hash, no login)
        const userRes = await client.query(
          `INSERT INTO users 
            (first_name, last_name, role, is_active, email, password_hash)
           VALUES ($1, $2, 'patient', true, $3, $4)
           RETURNING *`,
          [firstName.trim(), lastName.trim(), `dependent_${require('crypto').randomUUID()}@shms.local`, `!locked_${require('crypto').randomUUID()}`]
        );
        const depUser = userRes.rows[0];

        // 2. Create Patient row
        const patientRes = await client.query(
          `INSERT INTO patients 
            (user_id, date_of_birth, gender, blood_group, allergies, chronic_conditions, is_dependent)
           VALUES ($1, $2, $3, $4, $5, $6, true)
           RETURNING *`,
          [
            depUser.id,
            dateOfBirth || null,
            gender || null,
            bloodGroup || null,
            allergyArr,
            conditionArr
          ]
        );
        const depPatient = patientRes.rows[0];

        // 3. Create Patient Guardian link
        const pgRes = await client.query(
          `INSERT INTO patient_guardians 
            (guardian_patient_id, dependent_patient_id, relation)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [guardian.id, depPatient.id, relation]
        );

        // 4. Create health profile (inside the same transaction)
        await client.query(
          `INSERT INTO patient_health_profiles
            (patient_id, blood_group, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (patient_id) DO UPDATE SET
             blood_group = EXCLUDED.blood_group,
             allergies = EXCLUDED.allergies,
             chronic_conditions = EXCLUDED.chronic_conditions,
             emergency_contact_name = EXCLUDED.emergency_contact_name,
             emergency_contact_phone = EXCLUDED.emergency_contact_phone,
             updated_at = NOW()`,
          [
            depPatient.id,
            bloodGroup || null,
            allergyArr.length ? allergyArr.join(', ') : null,
            conditionArr.length ? conditionArr.join(', ') : null,
            `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim() || null,
            guardian.phone || null
          ]
        );

        return {
          id: depPatient.id,
          userId: depUser.id,
          firstName: depUser.first_name,
          lastName: depUser.last_name,
          relation,
          dateOfBirth: depPatient.date_of_birth,
          gender: depPatient.gender,
          bloodGroup: depPatient.blood_group,
          allergies: depPatient.allergies,
          chronicConditions: depPatient.chronic_conditions,
          isDependent: true,
          guardianLinkId: pgRes.rows[0].id
        };
      });
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Family management unavailable: Database table missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async updateDependent(guardianUserId, dependentPatientId, data) {
    try {
      const guardian = await Patient.findByUserId(guardianUserId);
      if (!guardian) {
        const err = new Error('Guardian patient profile not found');
        err.statusCode = 404;
        throw err;
      }

      // Verify guardian link
      const linkRes = await query(
        `SELECT pg.*, p.user_id as dependent_user_id
         FROM patient_guardians pg
         JOIN patients p ON pg.dependent_patient_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE pg.guardian_patient_id = $1 AND pg.dependent_patient_id = $2 AND u.is_active = true`,
        [guardian.id, dependentPatientId]
      );

      if (linkRes.rows.length === 0) {
        const err = new Error('Dependent patient not found or access forbidden');
        err.statusCode = 403;
        throw err;
      }

      const { firstName, lastName, relation, dateOfBirth, gender, bloodGroup, allergies, chronicConditions } = data;
      const dependentUserId = linkRes.rows[0].dependent_user_id;

      const toArray = (v) => {
        if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
        if (typeof v === 'string' && v.trim()) return v.split(',').map((s) => s.trim()).filter(Boolean);
        return null;
      };

      return await transaction(async (client) => {
        if (firstName || lastName) {
          await client.query(
            `UPDATE users SET 
              first_name = COALESCE($1, first_name),
              last_name = COALESCE($2, last_name),
              updated_at = NOW()
             WHERE id = $3`,
            [firstName ? firstName.trim() : null, lastName ? lastName.trim() : null, dependentUserId]
          );
        }

        await client.query(
          `UPDATE patients SET 
            date_of_birth = COALESCE($1, date_of_birth),
            gender = COALESCE($2, gender),
            blood_group = COALESCE($3, blood_group),
            allergies = COALESCE($4, allergies),
            chronic_conditions = COALESCE($5, chronic_conditions),
            updated_at = NOW()
           WHERE id = $6`,
          [dateOfBirth || null, gender || null, bloodGroup || null, toArray(allergies), toArray(chronicConditions), dependentPatientId]
        );

        if (relation) {
          await client.query(
            `UPDATE patient_guardians SET relation = $1 WHERE id = $2`,
            [relation, linkRes.rows[0].id]
          );
        }

        // Update health profile
        await PatientHealthProfile.upsert(dependentPatientId, {
          bloodGroup: bloodGroup || null,
          allergies: Array.isArray(allergies) ? allergies.join(', ') : allergies,
          chronicConditions: Array.isArray(chronicConditions) ? chronicConditions.join(', ') : chronicConditions
        });

        return Patient.findById(dependentPatientId);
      });
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Family management unavailable: Database table missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async deactivateDependent(guardianUserId, dependentPatientId) {
    try {
      const guardian = await Patient.findByUserId(guardianUserId);
      if (!guardian) {
        const err = new Error('Guardian patient profile not found');
        err.statusCode = 404;
        throw err;
      }

      const linkRes = await query(
        `SELECT pg.*, p.user_id as dependent_user_id
         FROM patient_guardians pg
         JOIN patients p ON pg.dependent_patient_id = p.id
         WHERE pg.guardian_patient_id = $1 AND pg.dependent_patient_id = $2`,
        [guardian.id, dependentPatientId]
      );

      if (linkRes.rows.length === 0) {
        const err = new Error('Dependent patient not found or access forbidden');
        err.statusCode = 403;
        throw err;
      }

      const dependentUserId = linkRes.rows[0].dependent_user_id;

      // Soft deactivate user account without deleting medical history or records
      await query(`UPDATE users SET is_active = false WHERE id = $1`, [dependentUserId]);

      return true;
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Family management unavailable: Database table missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }
}

module.exports = Family;
