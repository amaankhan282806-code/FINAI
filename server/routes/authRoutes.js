const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', authLimiter, authController.register);

// POST /api/auth/login
router.post('/login', authLimiter, authController.login);

// POST /api/auth/demo
router.post('/demo', authController.demoLogin);

// GET /api/auth/me
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
