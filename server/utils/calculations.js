/**
 * FINAI Financial Calculations & Business Logic Rules
 */

const { ELIGIBILITY_RULES } = require('../config/config');

/**
 * Evaluates Loan Eligibility based on configurable BFSI rules
 */
function evaluateEligibility(applicantData) {
  const {
    fullName = 'Applicant',
    age = 0,
    monthlySalary = 0,
    employmentType = 'Salaried',
    creditScore = 0,
    existingEmi = 0,
    desiredLoanAmount = 0,
    loanTenureMonths = 60
  } = applicantData;

  const numAge = Number(age);
  const numSalary = Number(monthlySalary);
  const numCredit = Number(creditScore);
  const numEmi = Number(existingEmi);
  const numDesired = Number(desiredLoanAmount);
  const numTenure = Number(loanTenureMonths);

  // Business Rules Checks
  const salaryCheck = {
    key: 'salary',
    label: 'Monthly Salary Requirement',
    passed: numSalary >= ELIGIBILITY_RULES.MIN_SALARY,
    actual: numSalary,
    required: ELIGIBILITY_RULES.MIN_SALARY,
    message: numSalary >= ELIGIBILITY_RULES.MIN_SALARY
      ? `Salary of ₹${numSalary.toLocaleString('en-IN')} meets the minimum requirement of ₹${ELIGIBILITY_RULES.MIN_SALARY.toLocaleString('en-IN')}.`
      : `Monthly salary of ₹${numSalary.toLocaleString('en-IN')} is below the minimum threshold of ₹${ELIGIBILITY_RULES.MIN_SALARY.toLocaleString('en-IN')}.`
  };

  const creditScoreCheck = {
    key: 'creditScore',
    label: 'Credit Score Threshold',
    passed: numCredit >= ELIGIBILITY_RULES.MIN_CREDIT_SCORE,
    actual: numCredit,
    required: ELIGIBILITY_RULES.MIN_CREDIT_SCORE,
    message: numCredit >= ELIGIBILITY_RULES.MIN_CREDIT_SCORE
      ? `Credit score of ${numCredit} is healthy (minimum required: ${ELIGIBILITY_RULES.MIN_CREDIT_SCORE}).`
      : `Credit score of ${numCredit} is below the target score of ${ELIGIBILITY_RULES.MIN_CREDIT_SCORE}.`
  };

  const emiObligationCheck = {
    key: 'existingEmi',
    label: 'Existing Debt Obligations',
    passed: numEmi <= ELIGIBILITY_RULES.MAX_EXISTING_EMI,
    actual: numEmi,
    required: ELIGIBILITY_RULES.MAX_EXISTING_EMI,
    message: numEmi <= ELIGIBILITY_RULES.MAX_EXISTING_EMI
      ? `Existing monthly EMI of ₹${numEmi.toLocaleString('en-IN')} is well within manageable limits (max ₹${ELIGIBILITY_RULES.MAX_EXISTING_EMI.toLocaleString('en-IN')}).`
      : `Existing monthly EMI of ₹${numEmi.toLocaleString('en-IN')} exceeds the recommended maximum threshold of ₹${ELIGIBILITY_RULES.MAX_EXISTING_EMI.toLocaleString('en-IN')}.`
  };

  const ageCheck = {
    key: 'age',
    label: 'Age Eligibility Criteria',
    passed: numAge >= ELIGIBILITY_RULES.MIN_AGE && numAge <= ELIGIBILITY_RULES.MAX_AGE,
    actual: numAge,
    required: `${ELIGIBILITY_RULES.MIN_AGE} - ${ELIGIBILITY_RULES.MAX_AGE} years`,
    message: (numAge >= ELIGIBILITY_RULES.MIN_AGE && numAge <= ELIGIBILITY_RULES.MAX_AGE)
      ? `Applicant age of ${numAge} meets the eligible working age bracket.`
      : `Applicant age must be between ${ELIGIBILITY_RULES.MIN_AGE} and ${ELIGIBILITY_RULES.MAX_AGE} years.`
  };

  // Rule: Indicative eligible loan amount = Monthly Salary × 20
  const indicativeEligibleAmount = Math.max(0, Math.round(numSalary * ELIGIBILITY_RULES.SALARY_MULTIPLIER));

  // Additional FOIR metrics for depth
  const maxAllowableTotalEmi = numSalary * ELIGIBILITY_RULES.MAX_FOIR;
  const availableEmiCapacity = Math.max(0, maxAllowableTotalEmi - numEmi);

  // Criteria summary
  const checks = [salaryCheck, creditScoreCheck, emiObligationCheck, ageCheck];
  const passedChecksCount = checks.filter(c => c.passed).length;
  const isEligible = passedChecksCount === checks.length;
  
  // Status: Eligible, Conditional, Ineligible
  let status = 'INELIGIBLE';
  let statusLabel = 'Not Eligible';
  let badgeColor = 'danger';

  if (isEligible) {
    if (numDesired <= indicativeEligibleAmount) {
      status = 'ELIGIBLE';
      statusLabel = 'Highly Eligible';
      badgeColor = 'success';
    } else {
      status = 'CONDITIONAL';
      statusLabel = 'Conditionally Eligible (Requested amount exceeds indicative limit)';
      badgeColor = 'warning';
    }
  } else if (passedChecksCount >= 2) {
    status = 'NEEDS_IMPROVEMENT';
    statusLabel = 'Requires Improvement';
    badgeColor = 'warning';
  }

  // Suggestions for improvement
  const suggestions = [];
  if (!salaryCheck.passed) {
    suggestions.push(`Consider adding a co-applicant (e.g. spouse or earning parent) with regular income to reach the combined ₹${ELIGIBILITY_RULES.MIN_SALARY.toLocaleString('en-IN')} threshold.`);
  }
  if (!creditScoreCheck.passed) {
    suggestions.push(`Work on raising your credit score above ${ELIGIBILITY_RULES.MIN_CREDIT_SCORE} by clearing overdue card balances and maintaining prompt on-time bill payments for at least 3-6 months.`);
  }
  if (!emiObligationCheck.passed) {
    suggestions.push(`Prepay or foreclose smaller short-term loans or credit card EMIs to bring your total monthly debt obligations below ₹${ELIGIBILITY_RULES.MAX_EXISTING_EMI.toLocaleString('en-IN')}.`);
  }
  if (numDesired > indicativeEligibleAmount) {
    suggestions.push(`The requested loan of ₹${numDesired.toLocaleString('en-IN')} is higher than your indicative limit of ₹${indicativeEligibleAmount.toLocaleString('en-IN')}. Try reducing the requested amount or opting for a longer tenure to lower the EMI burden.`);
  }
  if (suggestions.length === 0) {
    suggestions.push('Your financial profile looks strong! Maintaining low credit card utilization and stable employment will help secure competitive interest rates.');
  }

  // Score rating / health index (0 to 100)
  const creditFactor = Math.max(0, Math.min(1, (numCredit - 300) / 600));
  const salaryFactor = Math.max(0, Math.min(1, numSalary / 100000));
  const debtFreeFactor = Math.max(0, Math.min(1, 1 - (numEmi / (numSalary || 1))));
  
  const healthScore = Math.min(100, Math.round(
    (creditFactor * 40) +
    (salaryFactor * 25) +
    (debtFreeFactor * 20) +
    (isEligible ? 15 : 0)
  ));

  return {
    fullName,
    status,
    statusLabel,
    badgeColor,
    isEligible,
    indicativeEligibleAmount,
    requestedLoanAmount: numDesired,
    monthlySalary: numSalary,
    creditScore: numCredit,
    existingEmi: numEmi,
    loanTenureMonths: numTenure,
    employmentType,
    age: numAge,
    healthScore,
    availableEmiCapacity,
    checks,
    suggestions,
    evaluatedAt: new Date().toISOString(),
    disclaimer: 'This evaluation provides indicative guidance based on preliminary criteria and does not constitute a guaranteed loan approval or credit commitment from any financial institution.'
  };
}

/**
 * Calculates Equated Monthly Installment (EMI) and Amortization Schedule
 */
function calculateEMI(loanAmount, annualInterestRate, tenureMonths) {
  const principal = Number(loanAmount);
  const annualRate = Number(annualInterestRate);
  const tenure = Number(tenureMonths);

  if (principal <= 0 || annualRate < 0 || tenure <= 0) {
    throw new Error('Principal amount, interest rate, and tenure must be positive numbers.');
  }

  const monthlyRate = (annualRate / 12) / 100;
  let monthlyEmi = 0;

  if (monthlyRate === 0) {
    monthlyEmi = principal / tenure;
  } else {
    const factor = Math.pow(1 + monthlyRate, tenure);
    monthlyEmi = (principal * monthlyRate * factor) / (factor - 1);
  }

  const roundedEmi = Math.round(monthlyEmi);
  const totalRepayment = Math.round(roundedEmi * tenure);
  const totalInterest = Math.max(0, totalRepayment - principal);

  const principalRatio = Number(((principal / totalRepayment) * 100).toFixed(2));
  const interestRatio = Number(((totalInterest / totalRepayment) * 100).toFixed(2));

  // Generate Amortization Schedule
  let currentBalance = principal;
  const amortizationSchedule = [];
  const yearlyScheduleMap = {};

  for (let month = 1; month <= tenure; month++) {
    const interestPaid = Math.round(currentBalance * monthlyRate);
    let principalPaid = 0;
    
    // For final month, clear remaining balance exactly
    if (month === tenure) {
      principalPaid = currentBalance;
      currentBalance = 0;
    } else {
      principalPaid = Math.min(currentBalance, roundedEmi - interestPaid);
      currentBalance = Math.max(0, currentBalance - principalPaid);
    }

    const yearNumber = Math.ceil(month / 12);
    if (!yearlyScheduleMap[yearNumber]) {
      yearlyScheduleMap[yearNumber] = {
        year: yearNumber,
        principalPaid: 0,
        interestPaid: 0,
        totalPaid: 0,
        endingBalance: currentBalance
      };
    }
    yearlyScheduleMap[yearNumber].principalPaid += principalPaid;
    yearlyScheduleMap[yearNumber].interestPaid += interestPaid;
    yearlyScheduleMap[yearNumber].totalPaid += (principalPaid + interestPaid);
    yearlyScheduleMap[yearNumber].endingBalance = currentBalance;

    amortizationSchedule.push({
      month,
      year: yearNumber,
      emi: roundedEmi,
      principalPaid,
      interestPaid,
      remainingBalance: currentBalance
    });
  }

  return {
    principal,
    annualInterestRate: annualRate,
    tenureMonths: tenure,
    tenureYears: Number((tenure / 12).toFixed(1)),
    monthlyEmi: roundedEmi,
    totalInterest,
    totalRepayment,
    principalRatio,
    interestRatio,
    yearlySchedule: Object.values(yearlyScheduleMap),
    monthlyScheduleSample: amortizationSchedule,
    totalInstallments: tenure
  };
}

/**
 * Analyzes Credit Score & creates categorical breakdown with actionable advice
 */
function analyzeCreditScore(data) {
  const {
    creditScore = 750,
    paymentHistory = 'good', // 'excellent', 'good', 'fair', 'poor'
    creditUtilization = 25, // percentage
    creditHistoryLength = 4, // years
    activeLoans = 2,
    recentInquiries = 1
  } = data;

  const score = Math.max(300, Math.min(900, Number(creditScore)));
  const utilization = Math.max(0, Math.min(100, Number(creditUtilization)));
  const historyYears = Math.max(0, Number(creditHistoryLength));
  const loans = Math.max(0, Number(activeLoans));
  const inquiries = Math.max(0, Number(recentInquiries));

  // Rating categories
  let category = 'Good';
  let badgeColor = 'info';
  let description = 'Healthy credit standing with low default probability.';
  let approvalProbability = 'High';

  if (score >= 800) {
    category = 'Excellent';
    badgeColor = 'success';
    description = 'Prime credit standing. Eligible for best bank interest rates and pre-approved offers.';
    approvalProbability = 'Very High';
  } else if (score >= 740) {
    category = 'Very Good';
    badgeColor = 'success';
    description = 'Strong financial discipline. High probability of smooth loan approvals.';
    approvalProbability = 'High';
  } else if (score >= 670) {
    category = 'Good';
    badgeColor = 'info';
    description = 'Satisfactory credit profile. Meets standard lending benchmarks of most institutions.';
    approvalProbability = 'Moderate to High';
  } else if (score >= 580) {
    category = 'Fair';
    badgeColor = 'warning';
    description = 'Below average score. May require additional collateral, guarantor, or face higher interest rates.';
    approvalProbability = 'Conditional';
  } else {
    category = 'Poor';
    badgeColor = 'danger';
    description = 'Subprime risk category. High risk of rejection; urgent credit repair recommended.';
    approvalProbability = 'Low';
  }

  // Factor ratings
  const factors = [
    {
      name: 'Payment History',
      weight: '35%',
      status: (paymentHistory === 'excellent' || score >= 750) ? 'Excellent' : (paymentHistory === 'good' ? 'Good' : 'Needs Attention'),
      score: paymentHistory === 'excellent' ? 95 : (paymentHistory === 'good' ? 80 : 50),
      recommendation: 'Ensure all credit card bills and loan EMIs are settled prior to the due date. Even a single 30-day delay can drop your score by 40-70 points.'
    },
    {
      name: 'Credit Utilization Ratio',
      weight: '30%',
      actual: `${utilization}%`,
      status: utilization <= 30 ? 'Optimal' : (utilization <= 50 ? 'Moderate' : 'High Risk'),
      score: utilization <= 30 ? 90 : (utilization <= 50 ? 65 : 35),
      recommendation: utilization > 30
        ? `Your utilization is ${utilization}%. Keep total credit card spending under 30% of your credit limit to avoid appearing credit-hungry.`
        : 'Great job maintaining credit card utilization below the recommended 30% threshold.'
    },
    {
      name: 'Credit History Length',
      weight: '15%',
      actual: `${historyYears} years`,
      status: historyYears >= 5 ? 'Strong' : (historyYears >= 2 ? 'Moderate' : 'Developing'),
      score: Math.min(100, historyYears * 18),
      recommendation: 'Keep your oldest credit card accounts open even if rarely used; an older average account age significantly strengthens your profile.'
    },
    {
      name: 'Active Debt & Credit Mix',
      weight: '10%',
      actual: `${loans} active loans`,
      status: loans <= 3 ? 'Balanced' : 'High Exposure',
      score: loans <= 3 ? 85 : 55,
      recommendation: 'A healthy balance of secured credit (home/auto) and unsecured credit (personal/cards) demonstrates diverse credit handling capacity.'
    },
    {
      name: 'Recent Inquiries',
      weight: '10%',
      actual: `${inquiries} in last 6 months`,
      status: inquiries <= 2 ? 'Low Risk' : 'Caution',
      score: inquiries <= 2 ? 90 : 45,
      recommendation: inquiries > 2
        ? 'Avoid submitting multiple loan or credit card applications across banks within a short window, as each hard inquiry chips away at your score.'
        : 'Inquiry volume is safely controlled.'
    }
  ];

  return {
    score,
    minScore: 300,
    maxScore: 900,
    category,
    badgeColor,
    description,
    approvalProbability,
    factors,
    analyzedAt: new Date().toISOString(),
    disclaimer: 'This credit analysis is based on self-reported estimates for educational purposes and does not replace official reports from credit rating agencies (CIBIL, Experian, Equifax, CRIF High Mark).'
  };
}

module.exports = {
  evaluateEligibility,
  calculateEMI,
  analyzeCreditScore
};
