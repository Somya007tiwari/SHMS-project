const aiAssistantService = require('../services/aiAssistantService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const auditService = require('../services/auditService');

const aiAssistantController = {
  async getWelcome(req, res) {
    return sendSuccess(res, {
      message: 'Welcome to the SHMS AI Health Assistant. Describe your symptoms for informational triage guidance.',
      type: 'info'
    });
  },

  async analyze(req, res) {
    const { symptoms, age, gender, durationDays, language = 'en' } = req.body;

    const result = await aiAssistantService.analyzeSymptoms({
      symptoms,
      age,
      gender,
      durationDays,
      language,
      userId: req.user.userId
    });

    if (result.limitExceeded) {
      return res.status(429).json({
        success: false,
        message: result.message
      });
    }

    // Audit log only records that an assistant request happened (NEVER symptom text)
    await auditService.log(
      req,
      'view',
      'ai_assistant',
      req.user.userId,
      `AI Assistant query processed (mode: ${result.mode}, emergency: ${result.emergency})`
    );

    return sendSuccess(res, result);
  }
};

module.exports = aiAssistantController;
