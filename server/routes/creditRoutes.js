const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditController');
const { validateCreditInput } = require('../middleware/validation');

// POST /api/credit/analyze
router.post('/analyze', validateCreditInput, creditController.analyze);

module.exports = router;
