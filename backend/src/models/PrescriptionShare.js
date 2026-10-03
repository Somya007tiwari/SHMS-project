const crypto = require('crypto');
const { query } = require('../config/database');

class PrescriptionShare {
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async createShare({ prescriptionId, expiresInDays = 3, createdBy }) {
    const days = [1, 3, 7].includes(Number(expiresInDays)) ? Number(expiresInDays) : 3;
    const plainToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = this.hashToken(plainToken);

    const result = await query(
      `INSERT INTO prescription_shares (prescription_id, token_hash, expires_at, created_by)
       VALUES ($1, $2, NOW() + INTERVAL '1 day' * $3, $4)
       RETURNING id, prescription_id, expires_at, created_at`,
      [prescriptionId, tokenHash, days, createdBy]
    );

    const share = result.rows[0];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return {
      id: share.id,
      prescriptionId: share.prescription_id,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
      plainToken,
      shareUrl: `${frontendUrl}/prescriptions/shared/${plainToken}`
    };
  }

  static async getActiveShares(prescriptionId) {
    try {
      const result = await query(
        `SELECT id, expires_at, created_at, revoked_at
         FROM prescription_shares
         WHERE prescription_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [prescriptionId]
      );
      return result.rows;
    } catch (err) {
      if (err.message?.includes('relation "prescription_shares" does not exist')) {
        return [];
      }
      throw err;
    }
  }

  static async revokeShare(shareId, createdBy) {
    const result = await query(
      `UPDATE prescription_shares
       SET revoked_at = NOW()
       WHERE id = $1 AND (created_by = $2 OR EXISTS (
         SELECT 1 FROM prescriptions pr
         JOIN patients p ON pr.patient_id = p.id
         WHERE pr.id = prescription_shares.prescription_id AND p.user_id = $2
       ))
       RETURNING id`,
      [shareId, createdBy]
    );
    return result.rows.length > 0;
  }

  static async getSharedPrescription(plainToken) {
    if (!plainToken || typeof plainToken !== 'string') return { expired: true };
    const tokenHash = this.hashToken(plainToken.trim());

    try {
      const shareRes = await query(
        `SELECT s.id as share_id, s.expires_at, s.revoked_at, s.prescription_id
         FROM prescription_shares s
         WHERE s.token_hash = $1`,
        [tokenHash]
      );

      if (!shareRes.rows.length) return { expired: true };

      const share = shareRes.rows[0];
      const now = new Date();
      if (share.revoked_at || new Date(share.expires_at) < now) {
        return { expired: true };
      }

      // Fetch prescription details without sensitive patient contact info
      const result = await query(
        `SELECT pr.id, pr.prescription_number, pr.created_at, pr.diagnosis, pr.advice, pr.follow_up_date,
                du.first_name || ' ' || du.last_name as doctor_name,
                doc.specialization, doc.qualification, doc.registration_number, doc.signature_url,
                dep.name as department_name,
                p.gender, p.blood_group
         FROM prescriptions pr
         JOIN doctors doc ON pr.doctor_id = doc.id
         JOIN users du ON doc.user_id = du.id
         LEFT JOIN departments dep ON doc.department_id = dep.id
         JOIN patients p ON pr.patient_id = p.id
         WHERE pr.id = $1`,
        [share.prescription_id]
      );

      if (!result.rows.length) return { expired: true };

      const prescription = result.rows[0];
      const itemsRes = await query(
        `SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY sort_order ASC, created_at ASC`,
        [share.prescription_id]
      );

      return {
        expired: false,
        prescription: {
          ...prescription,
          items: itemsRes.rows,
          patient_email: undefined,
          patient_phone: undefined
        }
      };
    } catch (err) {
      if (err.message?.includes('relation "prescription_shares" does not exist')) {
        throw new Error('Prescription shares table missing. Run Phase 14.1 migration.');
      }
      throw err;
    }
  }
}

module.exports = PrescriptionShare;
