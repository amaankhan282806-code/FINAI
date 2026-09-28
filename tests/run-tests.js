/**
 * FINAI Automated Financial Calculation & Business Logic Tests
 */

const assert = require('assert');
const { evaluateEligibility, calculateEMI, analyzeCreditScore } = require('../server/utils/calculations');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

console.log('\n=============================================');
console.log('  RUNNING FINAI AUTOMATED UNIT & RULE TESTS  ');
console.log('=============================================\n');

// 1. EMI CALCULATOR TESTS
console.log('--- 1. EMI Calculations ---');

runTest('Standard Loan EMI calculation (₹1,00,000 at 12% for 12 months)', () => {
  const result = calculateEMI(100000, 12, 12);
  // Expected EMI for 100k at 1% per month for 12 months is ~ ₹8,885
  assert.strictEqual(result.monthlyEmi, 8885);
  assert.ok(result.totalInterest > 0);
  assert.strictEqual(result.principal, 100000);
  assert.strictEqual(result.totalRepayment, result.monthlyEmi * 12);
  assert.strictEqual(result.yearlySchedule.length, 1);
});

runTest('Zero Interest Loan EMI calculation (₹60,000 at 0% for 6 months)', () => {
  const result = calculateEMI(60000, 0, 6);
  assert.strictEqual(result.monthlyEmi, 10000);
  assert.strictEqual(result.totalInterest, 0);
  assert.strictEqual(result.totalRepayment, 60000);
});

runTest('EMI Amortization balances decrement to 0', () => {
  const result = calculateEMI(500000, 10.5, 24);
  assert.ok(result.monthlyEmi > 0);
  assert.strictEqual(result.monthlyScheduleSample.length, 24);
  const lastInstallment = result.monthlyScheduleSample[23];
  assert.strictEqual(lastInstallment.remainingBalance, 0);
});

runTest('Invalid EMI inputs throw appropriate error', () => {
  assert.throws(() => {
    calculateEMI(-10000, 10, 12);
  }, /must be positive numbers/);
});

// 2. LOAN ELIGIBILITY RULES TESTS
console.log('\n--- 2. Loan Eligibility Rules & Business Logic ---');

runTest('Candidate with ₹75,000 salary, 780 score, low EMI passes with High Eligibility', () => {
  const result = evaluateEligibility({
    fullName: 'Arjun Mehta',
    age: 28,
    monthlySalary: 75000,
    creditScore: 780,
    existingEmi: 8000,
    desiredLoanAmount: 1000000,
    loanTenureMonths: 60
  });

  assert.strictEqual(result.status, 'ELIGIBLE');
  assert.strictEqual(result.isEligible, true);
  // Indicative amount should be salary * 20 = 15,00,000
  assert.strictEqual(result.indicativeEligibleAmount, 1500000);
  assert.ok(result.healthScore >= 80);
  assert.strictEqual(result.checks.every(c => c.passed), true);
});

runTest('Salary below ₹30,000 fails eligibility requirement', () => {
  const result = evaluateEligibility({
    fullName: 'Suresh Kumar',
    age: 24,
    monthlySalary: 25000, // Below 30,000
    creditScore: 750,
    existingEmi: 5000,
    desiredLoanAmount: 400000
  });

  assert.strictEqual(result.isEligible, false);
  const salaryCheck = result.checks.find(c => c.key === 'salary');
  assert.strictEqual(salaryCheck.passed, false);
  assert.ok(result.suggestions.some(s => s.includes('30,000')));
});

runTest('Credit score below 700 fails credit score rule', () => {
  const result = evaluateEligibility({
    fullName: 'Deepak Roy',
    age: 32,
    monthlySalary: 55000,
    creditScore: 680, // Below 700
    existingEmi: 6000,
    desiredLoanAmount: 500000
  });

  assert.strictEqual(result.isEligible, false);
  const creditCheck = result.checks.find(c => c.key === 'creditScore');
  assert.strictEqual(creditCheck.passed, false);
  assert.ok(result.suggestions.some(s => s.includes('credit score above 700')));
});

runTest('Existing EMI above ₹20,000 fails debt obligations rule', () => {
  const result = evaluateEligibility({
    fullName: 'Neha Gupta',
    age: 30,
    monthlySalary: 60000,
    creditScore: 760,
    existingEmi: 25000, // Above 20,000
    desiredLoanAmount: 500000
  });

  assert.strictEqual(result.isEligible, false);
  const emiCheck = result.checks.find(c => c.key === 'existingEmi');
  assert.strictEqual(emiCheck.passed, false);
});

runTest('Applicant age below 21 fails age requirement', () => {
  const result = evaluateEligibility({
    fullName: 'Rohit Student',
    age: 19, // Below 21
    monthlySalary: 40000,
    creditScore: 730,
    existingEmi: 2000,
    desiredLoanAmount: 200000
  });

  assert.strictEqual(result.isEligible, false);
  const ageCheck = result.checks.find(c => c.key === 'age');
  assert.strictEqual(ageCheck.passed, false);
});

// 3. CREDIT SCORE ANALYZER TESTS
console.log('\n--- 3. Credit Score Analysis & Rating Matrix ---');

runTest('Credit score 820 is categorized as Excellent with prime benefits', () => {
  const analysis = analyzeCreditScore({ creditScore: 820, creditUtilization: 15 });
  assert.strictEqual(analysis.category, 'Excellent');
  assert.strictEqual(analysis.badgeColor, 'success');
  assert.strictEqual(analysis.approvalProbability, 'Very High');
});

runTest('Credit score 550 is categorized as Poor / High Risk', () => {
  const analysis = analyzeCreditScore({ creditScore: 550, creditUtilization: 65 });
  assert.strictEqual(analysis.category, 'Poor');
  assert.strictEqual(analysis.badgeColor, 'danger');
  assert.strictEqual(analysis.approvalProbability, 'Low');
});

runTest('High credit utilization (>30%) produces warning recommendation', () => {
  const analysis = analyzeCreditScore({ creditScore: 720, creditUtilization: 60 });
  const utilFactor = analysis.factors.find(f => f.name.includes('Utilization'));
  assert.strictEqual(utilFactor.status, 'High Risk');
  assert.ok(utilFactor.recommendation.includes('under 30%'));
});

// Test Summary
console.log('\n=============================================');
console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED  `);
console.log('=============================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
