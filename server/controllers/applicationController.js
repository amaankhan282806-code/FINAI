const storageService = require('../services/storageService');
const googleSheetsService = require('../services/googleSheetsService');

function getApplications(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 'usr_demo_finai';
    const applications = storageService.getApplications(userId);

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (err) {
    next(err);
  }
}

function getApplicationById(req, res, next) {
  try {
    const { id } = req.params;
    const application = storageService.getApplicationById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: `Application with reference ID ${id} not found.`
      });
    }

    // Data isolation: user cannot view another user's record
    if (req.user && req.user.id !== 'usr_demo_finai' && application.userId && application.userId !== req.user.id && application.userId !== 'usr_demo_finai') {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this application.'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (err) {
    next(err);
  }
}

async function saveApplication(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 'usr_demo_finai';
    const saved = storageService.saveApplication(req.body, userId);
    
    // Sync to Sheets
    const sheetSync = await googleSheetsService.syncApplication(saved);

    res.status(201).json({
      success: true,
      data: saved,
      sheetSync
    });
  } catch (err) {
    next(err);
  }
}

function deleteApplication(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const deleted = storageService.deleteApplication(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Record not found or not authorized to delete.'
      });
    }

    res.status(200).json({
      success: true,
      message: `Application ${id} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
}

function getSheetsStatus(req, res) {
  res.status(200).json({
    success: true,
    data: googleSheetsService.getStatus()
  });
}

async function testSheetsConnection(req, res, next) {
  try {
    const testResult = await googleSheetsService.testConnection();
    res.status(200).json({
      success: testResult.connected,
      data: testResult
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getApplications,
  getApplicationById,
  saveApplication,
  deleteApplication,
  getSheetsStatus,
  testSheetsConnection
};
