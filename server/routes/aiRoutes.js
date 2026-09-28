const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { aiLimiter } = require('../middleware/rateLimiter');
const { optionalAuth } = require('../middleware/authMiddleware');

// POST /api/ai/chat
router.post('/chat', optionalAuth, aiLimiter, aiController.chat);

// GET /api/ai/status
router.get('/status', aiController.getStatus);

module.exports = router;
