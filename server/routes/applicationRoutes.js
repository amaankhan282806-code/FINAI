const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');

// GET /api/applications
router.get('/', optionalAuth, applicationController.getApplications);

// GET /api/applications/:id
router.get('/:id', optionalAuth, applicationController.getApplicationById);

// POST /api/applications
router.post('/', optionalAuth, applicationController.saveApplication);

// DELETE /api/applications/:id
router.delete('/:id', optionalAuth, applicationController.deleteApplication);

module.exports = router;
