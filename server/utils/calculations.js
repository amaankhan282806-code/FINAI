/**
 * FINAI Financial Calculations & Business Logic Rules
 */

const { ELIGIBILITY_RULES } = require('../config/config');

/**
 * Evaluates Loan Eligibility based on defined BFSI rules:
 * 1. Monthly salary must be greater than ₹30,000 (> 30000).
 * 2. Credit score must be greater than 700 (> 700).
 * 3. Existing monthly EMI obligations must be below ₹20,000 (< 20000).
 * 4. Applicant age must be at least 21 years (>= 21 and <= 65).
 *
 * If all four conditions are satisfied:
 *   Eligible Loan Amount = Monthly Salary × 20
 * If any condition fails:
 *   Appropriate rejection reasons are displayed.
 */
function evaluateEligibility(applicantData = {}) {
  const fullName = applicantData.fullName || applicantData.name || 'Applicant';
  const rawAge = applicantData.age !== undefined ? applicantData.age : applicantData.applicantAge;
  const rawSalary = applicantData.monthlySalary !== undefined ? applicantData.monthlySalary : applicantData.salary;
  const rawCredit = applicantData.creditScore !== undefined ? applicantData.creditScore : applicantData.score;
  const rawEmi = applicantData.existingEmi !== undefined ? applicantData.existingEmi : (applicantData.emiInput !== undefined ? applicantData.emiInput : applicantData.emi);
  const rawDesired = applicantData.desiredLoanAmount !== undefined ? applicantData.desiredLoanAmount : (applicantData.loanAmount || 0);
  const rawTenure = applicantData.loanTenureMonths !== undefined ? applicantData.loanTenureMonths : (applicantData.tenure || 60);

  const numAge = Number(rawAge) || 0;
  const numSalary = Number(rawSalary) || 0;
  const numCredit = Number(rawCredit) || 0;
  const numEmi = Number(rawEmi) || 0;
  const numDesired = Number(rawDesired) || 0;
  const numTenure = Number(rawTenure) || 60;
  const employmentType = applicantData.employmentType || 'Salaried';

  // Rule 1: Monthly salary must be greater than ₹30,000 (> 30000)
  const salaryPassed = numSalary > ELIGIBILITY_RULES.MIN_SALARY;
  const salaryCheck = {
    key: 'salary',
    label: 'Monthly Salary Requirement',
    passed: salaryPassed,
    actual: numSalary,
    required: `> ₹${ELIGIBILITY_RULES.MIN_SALARY.toLocaleString('en-IN')}`,
    message: salaryPassed
      ? `Salary of ₹${numSalary.toLocaleString('en-IN')} meets the requirement of being greater than ₹${ELIGIBILITY_RULES.MIN_SALARY.toLocaleString('en-IN')}.`
      : `Monthly salary of ₹${numSalary.toLocaleString('en-IN')} is not greater than the required threshold of ₹${ELIGIBILITY_RULES.MIN_SALARY.toLocaleString('en-IN')}.`
  };

  // Rule 2: Credit score must be greater than 700 (> 700)
  const creditScorePassed = numCredit > ELIGIBILITY_RULES.MIN_CREDIT_SCORE;
  const creditScoreCheck = {
    key: 'creditScore',
    label: 'Credit Score Threshold',
    passed: creditScorePassed,
    actual: numCredit,
    required: `> ${ELIGIBILITY_RULES.MIN_CREDIT_SCORE}`,
    message: creditScorePassed
      ? `Credit score of ${numCredit} meets the requirement of being greater than ${ELIGIBILITY_RULES.MIN_CREDIT_SCORE}.`
      : `Credit score of ${numCredit} is not greater than the minimum benchmark of ${ELIGIBILITY_RULES.MIN_CREDIT_SCORE}.`
  };

  // Rule 3: Existing monthly EMI obligations must be below ₹20,000 (< 20000)
  const emiObligationPassed = numEmi < ELIGIBILITY_RULES.MAX_EXISTING_EMI;
  const emiObligationCheck = {
    key: 'existingEmi',
    label: 'Existing Debt Obligations',
    passed: emiObligationPassed,
    actual: numEmi,
    required: `< ₹${ELIGIBILITY_RULES.MAX_EXISTING_EMI.toLocaleString('en-IN')}`,
    message: emiObligationPassed
      ? `Existing monthly EMI of ₹${numEmi.toLocaleString('en-IN')} is below the maximum allowed threshold of ₹${ELIGIBILITY_RULES.MAX_EXISTING_EMI.toLocaleString('en-IN')}.`
      : `Existing monthly EMI obligations of ₹${numEmi.toLocaleString('en-IN')} must be below ₹${ELIGIBILITY_RULES.MAX_EXISTING_EMI.toLocaleString('en-IN')}.`
  };

  // Rule 4: Applicant age must be at least 21 years (>= 21 and <= 65)
  const agePassed = numAge >= ELIGIBILITY_RULES.MIN_AGE && numAge <= ELIGIBILITY_RULES.MAX_AGE;
  const ageCheck = {
    key: 'age',
    label: 'Age Eligibility Criteria',
    passed: agePassed,
    actual: numAge,
    required: `At least ${ELIGIBILITY_RULES.MIN_AGE} years (${ELIGIBILITY_RULES.MIN_AGE} - ${ELIGIBILITY_RULES.MAX_AGE})`,
    message: agePassed
      ? `Applicant age of ${numAge} meets the eligible working age bracket (at least ${ELIGIBILITY_RULES.MIN_AGE} years).`
      : `Applicant age must be at least ${ELIGIBILITY_RULES.MIN_AGE} years (and up to ${ELIGIBILITY_RULES.MAX_AGE} years).`
  };

  const checks = [salaryCheck, creditScoreCheck, emiObligationCheck, ageCheck];
  const failedChecks = checks.filter(c => !c.passed);
  const isEligible = failedChecks.length === 0;

  // Rejection reasons list
  const rejectionReasons = failedChecks.map(c => c.message);
  const rejectionReason = rejectionReasons.length > 0 ? rejectionReasons.join(' ') : null;

  // Calculation: If all four conditions satisfied -> Salary × 20
  const eligibleLoanAmount = isEligible ? Math.max(0, Math.round(numSalary * ELIGIBILITY_RULES.SALARY_MULTIPLIER)) : 0;
  const indicativeEligibleAmount = eligibleLoanAmount;

  // Additional FOIR metrics
  const maxAllowableTotalEmi = numSalary * ELIGIBILITY_RULES.MAX_FOIR;
  const availableEmiCapacity = Math.max(0, maxAllowableTotalEmi - numEmi);

  // Status mapping
  const status = isEligible ? 'ELIGIBLE' : 'REJECTED';
  const statusLabel = isEligible ? 'Eligible' : 'Rejected';
  const badgeColor = isEligible ? 'success' : 'danger';

  // Actionable suggestions for improvement
  const suggestions = [];
  if (!salaryCheck.passed) {
    suggestions.push(`Monthly salary must be greater than ₹${ELIGIBILITY_RULES.MIN_SALARY.toLocaleString('en-IN')}. Consider adding a co-applicant to increase combined household income.`);
  }
  if (!creditScoreCheck.passed) {
    suggestions.push(`Credit score must be strictly greater than ${ELIGIBILITY_RULES.MIN_CREDIT_SCORE}. Clear outstanding credit card balances and ensure 100% on-time payments.`);
  }
  if (!emiObligationCheck.passed) {
    suggestions.push(`Existing debt obligations of ₹${numEmi.toLocaleString('en-IN')} must be below ₹${ELIGIBILITY_RULES.MAX_EXISTING_EMI.toLocaleString('en-IN')}. Prepay smaller debts to reduce monthly obligations.`);
  }
  if (!ageCheck.passed) {
    suggestions.push(`Applicant must be at least ${ELIGIBILITY_RULES.MIN_AGE} years of age.`);
  }
  if (isEligible && numDesired > eligibleLoanAmount) {
    suggestions.push(`Requested loan amount (₹${numDesired.toLocaleString('en-IN')}) exceeds your eligible limit of ₹${eligibleLoanAmount.toLocaleString('en-IN')}. Consider requesting within the eligible limit or opting for a longer tenure.`);
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
    applicantName: fullName,
    status,
    statusLabel,
    badgeColor,
    isEligible,
    eligibleLoanAmount,
    indicativeEligibleAmount,
    rejectionReason,
    rejectionReasons,
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
 * Formula: EMI = (P × R × (1 + R)^N) / ((1 + R)^N − 1)
 * Zero interest: EMI = P / N
 */
function calculateEMI(loanAmount, annualInterestRate, tenureMonths) {
  const principal = Number(loanAmount);
  const annualRate = Number(annualInterestRate);
  const tenure = Number(tenureMonths);

  if (isNaN(principal) || principal <= 0) {
    throw new Error('Principal loan amount must be positive numbers.');
  }
  if (isNaN(annualRate) || annualRate < 0) {
    throw new Error('Annual interest rate must be 0 or a positive number.');
  }
  if (isNaN(tenure) || tenure <= 0) {
    throw new Error('Loan tenure in months must be positive numbers.');
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
  const totalRepayment = monthlyRate === 0 ? principal : Math.round(roundedEmi * tenure);
  const totalInterest = Math.max(0, totalRepayment - principal);

  const principalRatio = totalRepayment > 0 ? Number(((principal / totalRepayment) * 100).toFixed(2)) : 100;
  const interestRatio = totalRepayment > 0 ? Number(((totalInterest / totalRepayment) * 100).toFixed(2)) : 0;

  // Generate Amortization Schedule
  let currentBalance = principal;
  const amortizationSchedule = [];
  const yearlyScheduleMap = {};

  for (let month = 1; month <= tenure; month++) {
    const interestPaid = Math.round(currentBalance * monthlyRate);
    let principalPaid = 0;
    
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
 * Required classifications:
 * 750–900: Excellent
 * 650–749: Good
 * 300–649: Poor
 */
function analyzeCreditScore(data = {}) {
  const rawScore = data.creditScore !== undefined ? data.creditScore : data.score;

  if (rawScore === null || rawScore === undefined || rawScore === '') {
    throw new Error('Credit score is required.');
  }

  const scoreNum = Number(rawScore);
  if (isNaN(scoreNum)) {
    throw new Error('Credit score must be a valid number.');
  }

  if (scoreNum < 300 || scoreNum > 900) {
    throw new Error('Credit score must be between 300 and 900.');
  }

  const score = Math.round(scoreNum);
  const utilization = Math.max(0, Math.min(100, Number(data.creditUtilization) || 25));
  const historyYears = Math.max(0, Number(data.creditHistoryLength) || 4);
  const loans = Math.max(0, Number(data.activeLoans) || 2);
  const inquiries = Math.max(0, Number(data.recentInquiries) || 1);
  const paymentHistory = data.paymentHistory || 'good';

  let category = 'Poor';
  let badgeColor = 'danger';
  let description = 'Subprime risk profile (300–649). Significant risk of loan rejection; disciplined credit repair is required.';
  let approvalProbability = 'Low';

  if (score >= 750) {
    category = 'Excellent';
    badgeColor = 'success';
    description = 'Prime credit standing (750–900). Eligible for prime bank interest rates and high loan approval probability.';
    approvalProbability = 'Very High';
  } else if (score >= 650) {
    category = 'Good';
    badgeColor = 'info';
    description = 'Satisfactory credit standing (650–749). Note: FINAI loan eligibility specifically requires a score strictly greater than 700.';
    approvalProbability = score > 700 ? 'Moderate to High' : 'Moderate (Underwriting review required)';
  } else {
    category = 'Poor';
    badgeColor = 'danger';
    description = 'Subprime risk profile (300–649). Low probability of approval; credit repair recommended.';
    approvalProbability = 'Low';
  }

  const factors = [
    {
      name: 'Payment History',
      weight: '35%',
      status: (paymentHistory === 'excellent' || score >= 750) ? 'Excellent' : (paymentHistory === 'good' ? 'Good' : 'Needs Attention'),
      score: paymentHistory === 'excellent' ? 95 : (paymentHistory === 'good' ? 80 : 50),
      recommendation: 'Ensure all credit card bills and loan EMIs are settled prior to the due date. Timely payments account for 35% of your credit score.'
    },
    {
      name: 'Credit Utilization Ratio',
      weight: '30%',
      actual: `${utilization}%`,
      status: utilization <= 30 ? 'Optimal' : (utilization <= 50 ? 'Moderate' : 'High Risk'),
      score: utilization <= 30 ? 90 : (utilization <= 50 ? 65 : 35),
      recommendation: utilization > 30
        ? `Your utilization is ${utilization}%. Keep total credit card spending under 30% of your credit limit to avoid negative scoring impact.`
        : 'Excellent job keeping credit utilization below the 30% threshold.'
    },
    {
      name: 'Credit History Length',
      weight: '15%',
      actual: `${historyYears} years`,
      status: historyYears >= 5 ? 'Strong' : (historyYears >= 2 ? 'Moderate' : 'Developing'),
      score: Math.min(100, historyYears * 18),
      recommendation: 'Keep older credit card accounts active; average account age positively influences credit longevity ratings.'
    },
    {
      name: 'Active Debt & Credit Mix',
      weight: '10%',
      actual: `${loans} active loans`,
      status: loans <= 3 ? 'Balanced' : 'High Exposure',
      score: loans <= 3 ? 85 : 55,
      recommendation: 'Maintain a balanced credit mix between secured (home/auto) and unsecured (personal/card) credit.'
    },
    {
      name: 'Recent Inquiries',
      weight: '10%',
      actual: `${inquiries} in last 6 months`,
      status: inquiries <= 2 ? 'Low Risk' : 'Caution',
      score: inquiries <= 2 ? 90 : 45,
      recommendation: inquiries > 2
        ? 'Avoid submitting multiple loan or credit applications within a short period to prevent hard inquiry score deductions.'
        : 'Inquiry volume is safely managed.'
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
