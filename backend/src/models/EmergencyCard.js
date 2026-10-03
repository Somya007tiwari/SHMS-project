const { query } = require('../config/database');
const crypto = require('crypto');

class EmergencyCard {
  static hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  static async findByPatientId(patientId) {
    try {
      const result = await query(
        `SELECT id, patient_id, is_enabled, show_blood_group, show_allergies, 
                show_conditions, show_contact, show_age, created_at, updated_at, 
                last_viewed_at, view_count
         FROM emergency_cards
         WHERE patient_id = $1`,
        [patientId]
      );
      return result.rows[0] || null;
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Emergency card feature unavailable: Database table missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async upsertSettings(patientId, data, initialTokenHash = null) {
    try {
      const { isEnabled, showBloodGroup, showAllergies, showConditions, showContact, showAge } = data;

      const existing = await this.findByPatientId(patientId);

      if (!existing) {
        const tokenHash = initialTokenHash || this.hashToken(crypto.randomBytes(32).toString('hex'));
        const result = await query(
          `INSERT INTO emergency_cards 
            (patient_id, token_hash, is_enabled, show_blood_group, show_allergies, show_conditions, show_contact, show_age, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING id, patient_id, is_enabled, show_blood_group, show_allergies, show_conditions, show_contact, show_age, created_at, updated_at, last_viewed_at, view_count`,
          [
            patientId,
            tokenHash,
            isEnabled !== undefined ? isEnabled : false,
            showBloodGroup !== undefined ? showBloodGroup : true,
            showAllergies !== undefined ? showAllergies : true,
            showConditions !== undefined ? showConditions : false,
            showContact !== undefined ? showContact : true,
            showAge !== undefined ? showAge : false
          ]
        );
        return result.rows[0];
      } else {
        const result = await query(
          `UPDATE emergency_cards SET
            is_enabled = COALESCE($2, is_enabled),
            show_blood_group = COALESCE($3, show_blood_group),
            show_allergies = COALESCE($4, show_allergies),
            show_conditions = COALESCE($5, show_conditions),
            show_contact = COALESCE($6, show_contact),
            show_age = COALESCE($7, show_age),
            updated_at = NOW()
           WHERE patient_id = $1
           RETURNING id, patient_id, is_enabled, show_blood_group, show_allergies, show_conditions, show_contact, show_age, created_at, updated_at, last_viewed_at, view_count`,
          [
            patientId,
            isEnabled !== undefined ? isEnabled : null,
            showBloodGroup !== undefined ? showBloodGroup : null,
            showAllergies !== undefined ? showAllergies : null,
            showConditions !== undefined ? showConditions : null,
            showContact !== undefined ? showContact : null,
            showAge !== undefined ? showAge : null
          ]
        );
        return result.rows[0];
      }
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Emergency card feature unavailable: Database table missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async regenerateToken(patientId, rawToken) {
    try {
      const tokenHash = this.hashToken(rawToken);

      const existing = await this.findByPatientId(patientId);
      if (!existing) {
        return await this.upsertSettings(patientId, {}, tokenHash);
      }

      const result = await query(
        `UPDATE emergency_cards SET
          token_hash = $2,
          updated_at = NOW()
         WHERE patient_id = $1
         RETURNING id, patient_id, is_enabled, show_blood_group, show_allergies, show_conditions, show_contact, show_age, created_at, updated_at, last_viewed_at, view_count`,
        [patientId, tokenHash]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Emergency card feature unavailable: Database table missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async findPublicCardByToken(rawToken) {
    try {
      const tokenHash = this.hashToken(rawToken);
      const result = await query(
        `SELECT ec.*, 
                p.id as patient_id, p.user_id, p.date_of_birth, p.blood_group as patient_blood_group,
                p.allergies as patient_allergies, p.chronic_conditions as patient_chronic_conditions,
                p.emergency_contact_name as patient_emergency_name, p.emergency_contact_phone as patient_emergency_phone,
                u.first_name
         FROM emergency_cards ec
         JOIN patients p ON ec.patient_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE ec.token_hash = $1 AND ec.is_enabled = true`,
        [tokenHash]
      );
      return result.rows[0] || null;
    } catch (err) {
      if (err.code === '42P01') {
        const error = new Error('Emergency card feature unavailable: Database table missing');
        error.tableMissing = true;
        throw error;
      }
      throw err;
    }
  }

  static async recordView(cardId) {
    try {
      await query(
        `UPDATE emergency_cards 
         SET last_viewed_at = NOW(), 
             view_count = view_count + 1 
         WHERE id = $1`,
        [cardId]
      );
    } catch (err) {
      console.error('Failed to record emergency card view:', err.message);
    }
  }
}

module.exports = EmergencyCard;
