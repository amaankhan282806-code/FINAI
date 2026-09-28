const express = require('express');
const router = express.Router();
const eligibilityController = require('../controllers/eligibilityController');
const { validateEligibilityInput } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/authMiddleware');

// POST /api/eligibility/check
router.post('/check', optionalAuth, validateEligibilityInput, eligibilityController.checkEligibility);

module.exports = router;
