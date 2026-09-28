const creditService = require('../services/creditService');

function analyze(req, res, next) {
  try {
    const analysis = creditService.analyze(req.body);
    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  analyze
};
