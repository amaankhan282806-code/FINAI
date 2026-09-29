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

// POST /api/auth/logout
router.post('/logout', authController.logout);
router.get('/logout', authController.logout);

// Google OAuth Endpoints
router.get('/google', authController.initiateGoogleAuth);
router.get('/google/callback', authController.googleAuthCallback);
router.post('/google/token', authController.googleTokenAuth);
router.get('/google/status', authController.getGoogleAuthStatus);
router.post('/google/mock', authController.googleMockAuth);

module.exports = router;
