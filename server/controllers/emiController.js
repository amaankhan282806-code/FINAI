const emiService = require('../services/emiService');

function calculate(req, res, next) {
  try {
    const { loanAmount, annualInterestRate, tenureMonths } = req.sanitizedEmi;
    const result = emiService.compute(loanAmount, annualInterestRate, tenureMonths);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  calculate
};
