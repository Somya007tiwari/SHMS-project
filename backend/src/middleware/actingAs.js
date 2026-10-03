const { query } = require('../config/database');
const Patient = require('../models/Patient');

const resolveActingPatient = async (req, res, next) => {
  try {
    const actingPatientId = req.headers['x-acting-patient-id'];

    if (!actingPatientId || !req.user || req.user.role !== 'patient') {
      return next();
    }

    // Find guardian's own patient profile
    const guardianPatient = await Patient.findByUserId(req.user.userId);
    if (!guardianPatient) {
      return res.status(403).json({ success: false, message: 'Guardian patient profile not found' });
    }

    // If acting as self, proceed as normal
    if (actingPatientId === guardianPatient.id) {
      return next();
    }

    // Server-side validation against patient_guardians
    try {
      const linkRes = await query(
        `SELECT pg.*, p.user_id as dependent_user_id
         FROM patient_guardians pg
         JOIN patients p ON pg.dependent_patient_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE pg.guardian_patient_id = $1 AND pg.dependent_patient_id = $2 AND u.is_active = true`,
        [guardianPatient.id, actingPatientId]
      );

      if (linkRes.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: Invalid or unauthorized dependent patient ID'
        });
      }

      const link = linkRes.rows[0];

      // Expose acting context & override req.user.userId so existing controller calls resolve the dependent
      req.user.realUserId = req.user.userId;
      req.user.userId = link.dependent_user_id;

      // Log audit entry (ids only, no health data)
      const { AuditLog } = require('../models/Notification');
      AuditLog.create({
        userId: req.user.realUserId,
        action: 'ACTING_AS_DEPENDENT',
        entityType: 'patient',
        entityId: actingPatientId,
        description: `Guardian acting as dependent patient ${actingPatientId}`,
        ipAddress: null,
        userAgent: null,
        oldValues: null,
        newValues: null
      }).catch(() => {});

      next();
    } catch (dbErr) {
      // If table patient_guardians missing, ignore header (do not crash)
      if (dbErr.code === '42P01') {
        return next();
      }
      throw dbErr;
    }
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Failed to resolve acting patient context'
    });
  }
};

module.exports = resolveActingPatient;
