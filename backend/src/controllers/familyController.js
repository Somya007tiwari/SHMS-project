const Family = require('../models/Family');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const familyController = {
  // GET /api/family
  async getMyDependents(req, res) {
    try {
      // Always use real guardian user ID (req.user.realUserId || req.user.userId)
      const guardianUserId = req.user.realUserId || req.user.userId;
      const dependents = await Family.getDependents(guardianUserId);
      return sendSuccess(res, dependents);
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Family management feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to retrieve family members', 500);
    }
  },

  // POST /api/family
  async createDependent(req, res) {
    try {
      const { firstName, lastName, relation } = req.body;
      if (!firstName || !firstName.trim()) return sendError(res, 'First name is required', 400);
      if (!lastName || !lastName.trim()) return sendError(res, 'Last name is required', 400);

      const validRelations = ['parent', 'child', 'spouse', 'sibling', 'grandparent', 'other'];
      if (!relation || !validRelations.includes(relation)) {
        return sendError(res, `Relation must be one of: ${validRelations.join(', ')}`, 400);
      }

      const guardianUserId = req.user.realUserId || req.user.userId;
      const newDependent = await Family.createDependent(guardianUserId, req.body);

      return sendSuccess(res, newDependent, 'Family member profile created successfully', 201);
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Family management feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to create family member profile', err.statusCode || 500);
    }
  },

  // PUT /api/family/:id
  async updateDependent(req, res) {
    try {
      const dependentPatientId = req.params.id;
      const guardianUserId = req.user.realUserId || req.user.userId;

      const updated = await Family.updateDependent(guardianUserId, dependentPatientId, req.body);
      return sendSuccess(res, updated, 'Family member profile updated successfully');
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Family management feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to update family member profile', err.statusCode || 500);
    }
  },

  // DELETE /api/family/:id
  async deactivateDependent(req, res) {
    try {
      const dependentPatientId = req.params.id;
      const guardianUserId = req.user.realUserId || req.user.userId;

      await Family.deactivateDependent(guardianUserId, dependentPatientId);
      return sendSuccess(res, null, 'Family member profile deactivated successfully');
    } catch (err) {
      if (err.tableMissing || err.code === '42P01') {
        return sendError(res, 'Family management feature unavailable: Database table missing', 503);
      }
      return sendError(res, err.message || 'Failed to deactivate family member profile', err.statusCode || 500);
    }
  }
};

module.exports = familyController;
