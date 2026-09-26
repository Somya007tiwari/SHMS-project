const aiAssistantService = require('../services/aiAssistantService');
const { sendSuccess } = require('../utils/responseHandler');

const aiAssistantController = {
  async getWelcome(req, res) {
    const welcome = aiAssistantService.getWelcomeMessage();
    return sendSuccess(res, welcome);
  },

  async chat(req, res) {
    const { message, conversationHistory = [] } = req.body;
    if (!message || !message.trim()) {
      return sendSuccess(res, { message: 'Please enter a message.', type: 'error' });
    }

    const response = aiAssistantService.processMessage(message, conversationHistory);
    return sendSuccess(res, response);
  }
};

module.exports = aiAssistantController;
