const eligibilityService = require('../services/eligibilityService');
const logger = require('../utils/logger');

async function checkEligibility(req, res, next) {
  try {
    const applicantData = req.sanitizedBody;
    const userId = req.user ? req.user.id : 'usr_demo_finai';

    logger.info(`Processing loan eligibility check for: ${applicantData.fullName}`);
    const result = await eligibilityService.processEligibility(applicantData, userId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkEligibility
};
