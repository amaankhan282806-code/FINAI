/**
 * Request Input Validation and Sanitization Middleware
 */

function validateEligibilityInput(req, res, next) {
  const { fullName, age, monthlySalary, creditScore, existingEmi, desiredLoanAmount, loanTenureMonths } = req.body;

  const errors = [];

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push('Full name is required (minimum 2 characters).');
  }

  const numAge = Number(age);
  if (isNaN(numAge) || numAge < 18 || numAge > 100) {
    errors.push('Age must be a valid number between 18 and 100.');
  }

  const numSalary = Number(monthlySalary);
  if (isNaN(numSalary) || numSalary < 0) {
    errors.push('Monthly salary must be a positive number.');
  }

  const numCredit = Number(creditScore);
  if (isNaN(numCredit) || numCredit < 300 || numCredit > 900) {
    errors.push('Credit score must be between 300 and 900.');
  }

  const numEmi = Number(existingEmi);
  if (isNaN(numEmi) || numEmi < 0) {
    errors.push('Existing EMI must be 0 or a positive number.');
  }

  const numDesired = Number(desiredLoanAmount);
  if (isNaN(numDesired) || numDesired <= 0) {
    errors.push('Desired loan amount must be greater than zero.');
  }

  const numTenure = Number(loanTenureMonths);
  if (isNaN(numTenure) || numTenure < 6 || numTenure > 360) {
    errors.push('Loan tenure must be between 6 and 360 months.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  // Sanitized data
  req.sanitizedBody = {
    fullName: fullName.trim(),
    age: Math.round(numAge),
    monthlySalary: Math.round(numSalary),
    creditScore: Math.round(numCredit),
    existingEmi: Math.round(numEmi),
    desiredLoanAmount: Math.round(numDesired),
    loanTenureMonths: Math.round(numTenure),
    employmentType: req.body.employmentType || 'Salaried'
  };

  next();
}

function validateEmiInput(req, res, next) {
  const { loanAmount, annualInterestRate, tenureMonths } = req.body;
  const p = Number(loanAmount);
  const r = Number(annualInterestRate);
  const n = Number(tenureMonths);

  if (isNaN(p) || p <= 0) {
    return res.status(400).json({ success: false, error: 'Loan amount must be a positive number.' });
  }
  if (isNaN(r) || r < 0 || r > 50) {
    return res.status(400).json({ success: false, error: 'Annual interest rate must be between 0% and 50%.' });
  }
  if (isNaN(n) || n < 1 || n > 480) {
    return res.status(400).json({ success: false, error: 'Tenure must be between 1 and 480 months.' });
  }

  req.sanitizedEmi = { loanAmount: p, annualInterestRate: r, tenureMonths: Math.round(n) };
  next();
}

function validateCreditInput(req, res, next) {
  const { creditScore } = req.body;
  const score = Number(creditScore);

  if (isNaN(score) || score < 300 || score > 900) {
    return res.status(400).json({ success: false, error: 'Credit score must be between 300 and 900.' });
  }

  next();
}

module.exports = {
  validateEligibilityInput,
  validateEmiInput,
  validateCreditInput
};
