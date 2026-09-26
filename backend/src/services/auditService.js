const { AuditLog } = require('../models/Notification');

const auditService = {
  async log(req, action, entityType, entityId, description, oldValues = null, newValues = null) {
    try {
      await AuditLog.create({
        userId: req.user?.userId || null,
        action,
        entityType,
        entityId,
        description,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        oldValues,
        newValues
      });
    } catch (error) {
      // Audit failures should not block the main operation
      console.error('Audit log error:', error.message);
    }
  }
};

module.exports = auditService;
