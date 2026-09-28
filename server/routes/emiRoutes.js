const express = require('express');
const router = express.Router();
const emiController = require('../controllers/emiController');
const { validateEmiInput } = require('../middleware/validation');

// POST /api/emi/calculate
router.post('/calculate', validateEmiInput, emiController.calculate);

module.exports = router;
