const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const aiService = require('../services/aiService');
const googleSheetsService = require('../services/googleSheetsService');

// GET /api/health
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    appName: 'FINAI — AI Loan Eligibility Checker',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      anthropicClaude: aiService.isConfigured() ? 'CONFIGURED' : 'BFSI_FALLBACK_MODE',
      googleSheets: googleSheetsService.isConfigured ? 'CONFIGURED' : 'LOCAL_STORAGE_MODE'
    }
  });
});

// Google Sheets endpoints
router.get('/sheets/status', applicationController.getSheetsStatus);
router.post('/sheets/test', applicationController.testSheetsConnection);

module.exports = router;
