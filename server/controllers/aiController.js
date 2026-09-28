const aiService = require('../services/aiService');

async function chat(req, res, next) {
  try {
    const { message, history, context } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'A valid text prompt message is required.'
      });
    }

    const advice = await aiService.generateFinancialAdvice({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      context: context || {}
    });

    res.status(200).json({
      success: true,
      data: advice
    });
  } catch (err) {
    next(err);
  }
}

function getStatus(req, res) {
  res.status(200).json({
    success: true,
    data: {
      isClaudeConfigured: aiService.isConfigured(),
      isAiConfigured: aiService.isConfigured(),
      model: aiService.getActiveProviderName(),
      mode: aiService.getActiveProviderName()
    }
  });
}

module.exports = {
  chat,
  getStatus
};
