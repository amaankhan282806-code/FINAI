const { evaluateEligibility } = require('../utils/calculations');
const storageService = require('./storageService');
const googleSheetsService = require('./googleSheetsService');
const logger = require('../utils/logger');

class EligibilityService {
  async processEligibility(applicantData, userId = 'usr_demo_finai') {
    // 1. Calculate eligibility & breakdown
    const result = evaluateEligibility(applicantData);

    // 2. Persist record locally
    const savedRecord = storageService.saveApplication(result, userId);

    // 3. Asynchronously attempt Google Sheets sync
    googleSheetsService.syncApplication(savedRecord).catch(err => {
      logger.warn('Google Sheets background sync encountered notice:', err.message);
    });

    return savedRecord;
  }
}

module.exports = new EligibilityService();
