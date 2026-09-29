/**
 * Request Input Validation and Sanitization Middleware
 */

function validateEligibilityInput(req, res, next) {
  const body = req.body || {};
  const fullName = body.fullName || body.name;
  const rawAge = body.age !== undefined ? body.age : body.applicantAge;
  const rawSalary = body.monthlySalary !== undefined ? body.monthlySalary : body.salary;
  const rawCredit = body.creditScore !== undefined ? body.creditScore : body.score;
  const rawEmi = body.existingEmi !== undefined ? body.existingEmi : (body.emiInput !== undefined ? body.emiInput : body.emi);
  const rawDesired = body.desiredLoanAmount !== undefined ? body.desiredLoanAmount : (body.loanAmount || 0);
  const rawTenure = body.loanTenureMonths !== undefined ? body.loanTenureMonths : (body.tenure || 60);

  const errors = [];

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push('Applicant name is required (minimum 2 characters).');
  }

  const numAge = Number(rawAge);
  if (rawAge === undefined || rawAge === null || isNaN(numAge) || numAge < 18 || numAge > 100) {
    errors.push('Applicant age must be a valid number between 18 and 100.');
  }

  const numSalary = Number(rawSalary);
  if (rawSalary === undefined || rawSalary === null || isNaN(numSalary) || numSalary < 0) {
    errors.push('Monthly salary must be 0 or a positive number.');
  }

  const numCredit = Number(rawCredit);
  if (rawCredit === undefined || rawCredit === null || isNaN(numCredit) || numCredit < 300 || numCredit > 900) {
    errors.push('Credit score must be a number between 300 and 900.');
  }

  const numEmi = Number(rawEmi);
  if (rawEmi === undefined || rawEmi === null || isNaN(numEmi) || numEmi < 0) {
    errors.push('Existing monthly EMI must be 0 or a positive number.');
  }

  let numDesired = Number(rawDesired);
  if (isNaN(numDesired) || numDesired <= 0) {
    // Default to salary * 20 or 500,000 if not specified
    numDesired = Math.max(50000, (numSalary || 30000) * 20);
  }

  let numTenure = Number(rawTenure);
  if (isNaN(numTenure) || numTenure < 6 || numTenure > 360) {
    numTenure = 60;
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  // Sanitized data passed to controller
  req.sanitizedBody = {
    fullName: String(fullName).trim(),
    name: String(fullName).trim(),
    age: Math.round(numAge),
    monthlySalary: Math.round(numSalary),
    salary: Math.round(numSalary),
    creditScore: Math.round(numCredit),
    score: Math.round(numCredit),
    existingEmi: Math.round(numEmi),
    emiInput: Math.round(numEmi),
    desiredLoanAmount: Math.round(numDesired),
    loanTenureMonths: Math.round(numTenure),
    employmentType: body.employmentType || 'Salaried'
  };

  next();
}

function validateEmiInput(req, res, next) {
  const body = req.body || {};
  const rawP = body.loanAmount !== undefined ? body.loanAmount : (body.principal !== undefined ? body.principal : body.amount);
  const rawR = body.annualInterestRate !== undefined ? body.annualInterestRate : (body.interestRate !== undefined ? body.interestRate : body.rate);
  const rawN = body.tenureMonths !== undefined ? body.tenureMonths : (body.tenure !== undefined ? body.tenure : body.months);

  const p = Number(rawP);
  const r = Number(rawR);
  const n = Number(rawN);

  if (isNaN(p) || p <= 0) {
    return res.status(400).json({ success: false, error: 'Principal loan amount must be a positive number.' });
  }
  if (isNaN(r) || r < 0 || r > 50) {
    return res.status(400).json({ success: false, error: 'Annual interest rate must be between 0% and 50%.' });
  }
  if (isNaN(n) || n < 1 || n > 480) {
    return res.status(400).json({ success: false, error: 'Tenure must be between 1 and 480 months.' });
  }

  req.sanitizedEmi = {
    loanAmount: p,
    annualInterestRate: r,
    tenureMonths: Math.round(n)
  };
  next();
}

function validateCreditInput(req, res, next) {
  const body = req.body || {};
  const rawScore = body.creditScore !== undefined ? body.creditScore : body.score;

  if (rawScore === null || rawScore === undefined || rawScore === '') {
    return res.status(400).json({ success: false, error: 'Credit score is required.' });
  }

  const score = Number(rawScore);
  if (isNaN(score) || score < 300 || score > 900) {
    return res.status(400).json({ success: false, error: 'Credit score must be a number between 300 and 900.' });
  }

  req.body.creditScore = score;
  next();
}

module.exports = {
  validateEligibilityInput,
  validateEmiInput,
  validateCreditInput
};
