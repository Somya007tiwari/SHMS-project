const crypto = require('crypto');
const EmergencyCard = require('../models/EmergencyCard');
const Patient = require('../models/Patient');
const PatientHealthProfile = require('../models/PatientHealthProfile');
const notificationService = require('../services/notificationService');
const { AuditLog } = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const emergencyCardController = {
  // GET /api/emergency-card/me
  async getMyCard(req, res) {
    try {
      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient) {
        return sendError(res, 'Patient profile not found', 404);
      }

      let card = await EmergencyCard.findByPatientId(patient.id);

      if (!card) {
        // Initialize default card settings & initial token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = EmergencyCard.hashToken(rawToken);
        card = await EmergencyCard.upsertSettings(patient.id, {}, tokenHash);
        
        return sendSuccess(res, 'Emergency card settings retrieved', {
          ...card,
          publicUrl: `${getFrontendUrl()}/emergency/${rawToken}`
        });
      }

      return sendSuccess(res, 'Emergency card settings retrieved', card);
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Emergency card feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to retrieve emergency card settings', 500);
    }
  },

  // PUT /api/emergency-card/me
  async updateMyCard(req, res) {
    try {
      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient) {
        return sendError(res, 'Patient profile not found', 404);
      }

      const { isEnabled, showBloodGroup, showAllergies, showConditions, showContact, showAge } = req.body;

      const updatedCard = await EmergencyCard.upsertSettings(patient.id, {
        isEnabled,
        showBloodGroup,
        showAllergies,
        showConditions,
        showContact,
        showAge
      });

      return sendSuccess(res, 'Emergency card settings updated', updatedCard);
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Emergency card feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to update emergency card settings', 500);
    }
  },

  // POST /api/emergency-card/me/regenerate
  async regenerateToken(req, res) {
    try {
      const patient = await Patient.findByUserId(req.user.userId);
      if (!patient) {
        return sendError(res, 'Patient profile not found', 404);
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const updatedCard = await EmergencyCard.regenerateToken(patient.id, rawToken);

      const publicUrl = `${getFrontendUrl()}/emergency/${rawToken}`;

      return sendSuccess(res, 'Emergency card link regenerated successfully', {
        ...updatedCard,
        publicUrl,
        token: rawToken
      });
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Emergency card feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to regenerate emergency card link', 500);
    }
  },

  // GET /api/emergency-card/public/:token
  async getPublicCard(req, res) {
    try {
      const { token } = req.params;

      // Set mandatory Cache-Control header
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

      if (!token || token.length < 16) {
        return res.status(404).json({ success: false, message: 'Emergency card not found or disabled' });
      }

      const card = await EmergencyCard.findPublicCardByToken(token);
      if (!card || !card.is_enabled) {
        return res.status(404).json({ success: false, message: 'Emergency card not found or disabled' });
      }

      // Fetch patient health profile
      const healthProfile = await PatientHealthProfile.getByPatientId(card.patient_id);

      // Compute age if enabled
      let age = null;
      if (card.show_age && card.date_of_birth) {
        const birthDate = new Date(card.date_of_birth);
        const diffMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(diffMs);
        age = Math.abs(ageDate.getUTCFullYear() - 1970);
      }

      // Filter fields based strictly on patient preference
      const formatVal = (hpVal, pVal) => {
        const val = hpVal || pVal;
        if (!val) return null;
        if (Array.isArray(val)) return val.join(', ');
        return String(val);
      };

      const payload = {
        firstName: card.first_name,
        bloodGroup: card.show_blood_group ? (healthProfile?.blood_group || card.patient_blood_group || null) : null,
        allergies: card.show_allergies ? formatVal(healthProfile?.allergies, card.patient_allergies) : null,
        chronicConditions: card.show_conditions ? formatVal(healthProfile?.chronic_conditions, card.patient_chronic_conditions) : null,
        emergencyContactName: card.show_contact ? (healthProfile?.emergency_contact_name || card.patient_emergency_name || null) : null,
        emergencyContactPhone: card.show_contact ? (healthProfile?.emergency_contact_phone || card.patient_emergency_phone || null) : null,
        age: card.show_age ? age : null
      };

      // Asynchronously record view count & update last_viewed_at
      EmergencyCard.recordView(card.id).catch(() => {});

      // Asynchronously record audit log (patient ID only, no viewer IP, no data)
      AuditLog.create({
        userId: card.user_id,
        action: 'EMERGENCY_CARD_VIEWED',
        entityType: 'emergency_card',
        entityId: card.id,
        description: 'Emergency card viewed via QR scan',
        ipAddress: null,
        userAgent: null,
        oldValues: null,
        newValues: null
      }).catch(() => {});

      // Notify patient at most once per hour
      const lastViewed = card.last_viewed_at ? new Date(card.last_viewed_at).getTime() : 0;
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (!card.last_viewed_at || lastViewed < oneHourAgo) {
        notificationService.notify(card.user_id, {
          type: 'emergency_card_viewed',
          title: 'Emergency Card Scanned 🚨',
          message: 'Your emergency health card was recently scanned and viewed.',
          link: '/patient/emergency-card'
        }).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        data: payload
      });
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return res.status(404).json({ success: false, message: 'Emergency card not found or disabled' });
      }
      return res.status(404).json({ success: false, message: 'Emergency card not found or disabled' });
    }
  }
};

module.exports = emergencyCardController;
