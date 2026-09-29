/**
 * FINAI Comprehensive Financial Logic & Business Rule Automated Test Suite
 * Fully verifies Milestone 3 Specifications and Test Cases
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

console.log('\n=============================================================');
console.log('   FINAI FINANCIAL AUDIT: UNIT & BUSINESS LOGIC TEST SUITE   ');
console.log('=============================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: LOAN ELIGIBILITY CHECKER TESTS (Milestone 3, Activity 3.1)
// -----------------------------------------------------------------------------
console.log('--- 1. Loan Eligibility Checker (Activity 3.1 Test Cases) ---');

// Test 1: Salary ₹50,000, 780 score, ₹5,000 EMI, 25 age -> Eligible
runTest('Test 1: ₹50,000 salary, 780 score, ₹5,000 EMI, age 25 -> Eligible (Limit: ₹10,00,000)', () => {
  const result = evaluateEligibility({
    fullName: 'Test Candidate 1',
    age: 25,
    monthlySalary: 50000,
    creditScore: 780,
    existingEmi: 5000
  });
  assert.strictEqual(result.isEligible, true);
  assert.strictEqual(result.status, 'ELIGIBLE');
  assert.strictEqual(result.eligibleLoanAmount, 1000000); // 50000 * 20
  assert.strictEqual(result.indicativeEligibleAmount, 1000000);
});

// Test 2: Salary ₹30,000, 780 score, ₹5,000 EMI, 25 age -> Rejected (must be > 30,000)
runTest('Test 2 (Boundary): ₹30,000 salary, 780 score, ₹5,000 EMI, age 25 -> Rejected (Must be > ₹30,000)', () => {
  const result = evaluateEligibility({
    fullName: 'Test Candidate 2',
    age: 25,
    monthlySalary: 30000,
    creditScore: 780,
    existingEmi: 5000
  });
  assert.strictEqual(result.isEligible, false);
  assert.strictEqual(result.status, 'REJECTED');
  assert.strictEqual(result.eligibleLoanAmount, 0);
  const salaryCheck = result.checks.find(c => c.key === 'salary');
  assert.strictEqual(salaryCheck.passed, false);
});

// Test 3: Salary ₹30,001, 700 score, ₹5,000 EMI, 25 age -> Rejected (must be > 700)
runTest('Test 3 (Boundary): ₹30,001 salary, 700 score, ₹5,000 EMI, age 25 -> Rejected (Must be > 700 score)', () => {
  const result = evaluateEligibility({
    fullName: 'Test Candidate 3',
    age: 25,
    monthlySalary: 30001,
    creditScore: 700,
    existingEmi: 5000
  });
  assert.strictEqual(result.isEligible, false);
  assert.strictEqual(result.status, 'REJECTED');
  assert.strictEqual(result.eligibleLoanAmount, 0);
  const creditCheck = result.checks.find(c => c.key === 'creditScore');
  assert.strictEqual(creditCheck.passed, false);
});

// Test 4: Salary ₹50,000, 750 score, ₹20,000 EMI, 25 age -> Rejected (must be < 20,000)
runTest('Test 4 (Boundary): ₹50,000 salary, 750 score, ₹20,000 EMI, age 25 -> Rejected (Must be < ₹20,000 EMI)', () => {
  const result = evaluateEligibility({
    fullName: 'Test Candidate 4',
    age: 25,
    monthlySalary: 50000,
    creditScore: 750,
    existingEmi: 20000
  });
  assert.strictEqual(result.isEligible, false);
  assert.strictEqual(result.status, 'REJECTED');
  assert.strictEqual(result.eligibleLoanAmount, 0);
  const emiCheck = result.checks.find(c => c.key === 'existingEmi');
  assert.strictEqual(emiCheck.passed, false);
});

// Test 5: Salary ₹50,000, 780 score, ₹5,000 EMI, 20 age -> Rejected (must be >= 21)
runTest('Test 5 (Boundary): ₹50,000 salary, 780 score, ₹5,000 EMI, age 20 -> Rejected (Age < 21)', () => {
  const result = evaluateEligibility({
    fullName: 'Test Candidate 5',
    age: 20,
    monthlySalary: 50000,
    creditScore: 780,
    existingEmi: 5000
  });
  assert.strictEqual(result.isEligible, false);
  assert.strictEqual(result.status, 'REJECTED');
  const ageCheck = result.checks.find(c => c.key === 'age');
  assert.strictEqual(ageCheck.passed, false);
});

// Test 6: Salary ₹75,000, 820 score, ₹10,000 EMI, 30 age -> Eligible (Limit: ₹15,00,000)
runTest('Test 6: ₹75,000 salary, 820 score, ₹10,000 EMI, age 30 -> Eligible (Limit: ₹15,00,000)', () => {
  const result = evaluateEligibility({
    fullName: 'Test Candidate 6',
    age: 30,
    monthlySalary: 75000,
    creditScore: 820,
    existingEmi: 10000
  });
  assert.strictEqual(result.isEligible, true);
  assert.strictEqual(result.status, 'ELIGIBLE');
  assert.strictEqual(result.eligibleLoanAmount, 1500000);
});

// Test 7: Salary ₹0, 780 score, ₹0 EMI, 25 age -> Rejected
runTest('Test 7: ₹0 salary, 780 score, ₹0 EMI, age 25 -> Rejected', () => {
  const result = evaluateEligibility({
    fullName: 'Test Candidate 7',
    age: 25,
    monthlySalary: 0,
    creditScore: 780,
    existingEmi: 0
  });
  assert.strictEqual(result.isEligible, false);
  assert.strictEqual(result.status, 'REJECTED');
});

// Test 8: Salary ₹50,000, 900 score, ₹5,000 EMI, 21 age -> Eligible (Age exactly 21)
runTest('Test 8 (Boundary): ₹50,000 salary, 900 score, ₹5,000 EMI, age 21 -> Eligible (Boundary age: 21)', () => {
  const result = evaluateEligibility({
    fullName: 'Test Candidate 8',
    age: 21,
    monthlySalary: 50000,
    creditScore: 900,
    existingEmi: 5000
  });
  assert.strictEqual(result.isEligible, true);
  assert.strictEqual(result.status, 'ELIGIBLE');
  assert.strictEqual(result.eligibleLoanAmount, 1000000);
});

// Alternate field alias testing (name, salary, score, emiInput)
runTest('Field Aliases: accepts name, salary, score, emiInput seamlessly', () => {
  const result = evaluateEligibility({
    name: 'Pooja Verma',
    age: 26,
    salary: 60000,
    score: 760,
    emiInput: 8000
  });
  assert.strictEqual(result.isEligible, true);
  assert.strictEqual(result.fullName, 'Pooja Verma');
  assert.strictEqual(result.eligibleLoanAmount, 1200000);
});

// Multiple failed conditions check
runTest('Multiple Failed Conditions: reports all failed criteria reasons', () => {
  const result = evaluateEligibility({
    fullName: 'Multi Fail Candidate',
    age: 19,
    monthlySalary: 20000,
    creditScore: 620,
    existingEmi: 28000
  });
  assert.strictEqual(result.isEligible, false);
  assert.strictEqual(result.checks.filter(c => !c.passed).length, 4);
  assert.ok(result.rejectionReasons.length === 4);
});

// -----------------------------------------------------------------------------
// SECTION 2: CREDIT SCORE ANALYZER TESTS (Milestone 3, Activity 3.2)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Credit Score Analyzer (Activity 3.2 Test Cases) ---');

// Specific points required by prompt: 300, 400, 649, 650, 700, 749, 750, 800, 900
runTest('Score 300 -> Poor', () => {
  const res = analyzeCreditScore({ creditScore: 300 });
  assert.strictEqual(res.category, 'Poor');
  assert.strictEqual(res.badgeColor, 'danger');
  assert.strictEqual(res.approvalProbability, 'Low');
});

runTest('Score 400 -> Poor', () => {
  const res = analyzeCreditScore({ creditScore: 400 });
  assert.strictEqual(res.category, 'Poor');
  assert.strictEqual(res.badgeColor, 'danger');
});

runTest('Score 649 (Boundary) -> Poor', () => {
  const res = analyzeCreditScore({ creditScore: 649 });
  assert.strictEqual(res.category, 'Poor');
  assert.strictEqual(res.badgeColor, 'danger');
});

runTest('Score 650 (Boundary) -> Good', () => {
  const res = analyzeCreditScore({ creditScore: 650 });
  assert.strictEqual(res.category, 'Good');
  assert.strictEqual(res.badgeColor, 'info');
});

runTest('Score 700 -> Good', () => {
  const res = analyzeCreditScore({ creditScore: 700 });
  assert.strictEqual(res.category, 'Good');
  assert.strictEqual(res.badgeColor, 'info');
});

runTest('Score 749 (Boundary) -> Good', () => {
  const res = analyzeCreditScore({ creditScore: 749 });
  assert.strictEqual(res.category, 'Good');
  assert.strictEqual(res.badgeColor, 'info');
});

runTest('Score 750 (Boundary) -> Excellent', () => {
  const res = analyzeCreditScore({ creditScore: 750 });
  assert.strictEqual(res.category, 'Excellent');
  assert.strictEqual(res.badgeColor, 'success');
  assert.strictEqual(res.approvalProbability, 'Very High');
});

runTest('Score 800 -> Excellent', () => {
  const res = analyzeCreditScore({ creditScore: 800 });
  assert.strictEqual(res.category, 'Excellent');
  assert.strictEqual(res.badgeColor, 'success');
});

runTest('Score 900 -> Excellent', () => {
  const res = analyzeCreditScore({ creditScore: 900 });
  assert.strictEqual(res.category, 'Excellent');
  assert.strictEqual(res.badgeColor, 'success');
});

// Error handling tests
runTest('Invalid Input Validation: empty score throws error', () => {
  assert.throws(() => analyzeCreditScore({ creditScore: null }), /Credit score is required/);
});

runTest('Invalid Input Validation: negative score throws error', () => {
  assert.throws(() => analyzeCreditScore({ creditScore: -50 }), /between 300 and 900/);
});

runTest('Invalid Input Validation: score > 900 throws error', () => {
  assert.throws(() => analyzeCreditScore({ creditScore: 950 }), /between 300 and 900/);
});

runTest('Invalid Input Validation: non-numeric string throws error', () => {
  assert.throws(() => analyzeCreditScore({ creditScore: 'invalid' }), /valid number/);
});

// -----------------------------------------------------------------------------
// SECTION 3: EMI CALCULATOR TESTS (Milestone 3, Activity 3.3)
// -----------------------------------------------------------------------------
console.log('\n--- 3. EMI Calculator (Activity 3.3 Test Cases) ---');

// Test 1: ₹5,00,000, 10%, 5 years (60 months) -> ₹10,624
runTest('Test 1: ₹5,00,000 at 10% for 5 years (60 mo) -> EMI ₹10,624', () => {
  const res = calculateEMI(500000, 10, 60);
  assert.strictEqual(res.monthlyEmi, 10624);
  assert.strictEqual(res.totalRepayment, 10624 * 60);
  assert.strictEqual(res.totalInterest, res.totalRepayment - 500000);
});

// Test 2: ₹10,00,000, 8.5%, 10 years (120 months) -> ₹12,399
runTest('Test 2: ₹10,00,000 at 8.5% for 10 years (120 mo) -> EMI ₹12,399', () => {
  const res = calculateEMI(1000000, 8.5, 120);
  assert.strictEqual(res.monthlyEmi, 12399);
  assert.strictEqual(res.totalRepayment, 12399 * 120);
});

// Test 3: ₹2,00,000, 0%, 2 years (24 months) -> ₹8,333 (Zero-interest test)
runTest('Test 3 (Zero Interest): ₹2,00,000 at 0% for 2 years (24 mo) -> EMI ₹8,333, Interest ₹0', () => {
  const res = calculateEMI(200000, 0, 24);
  assert.strictEqual(res.monthlyEmi, 8333);
  assert.strictEqual(res.totalInterest, 0);
  assert.strictEqual(res.totalRepayment, 200000);
});

// Test 4: ₹15,00,000, 12%, 15 years (180 months) -> ₹18,003
runTest('Test 4: ₹15,00,000 at 12% for 15 years (180 mo) -> EMI ₹18,003', () => {
  const res = calculateEMI(1500000, 12, 180);
  assert.strictEqual(res.monthlyEmi, 18003);
  assert.strictEqual(res.totalRepayment, 18003 * 180);
});

// Test 5: ₹1,00,000, 18%, 1 year (12 months) -> ₹9,168
runTest('Test 5: ₹1,00,000 at 18% for 1 year (12 mo) -> EMI ₹9,168', () => {
  const res = calculateEMI(100000, 18, 12);
  assert.strictEqual(res.monthlyEmi, 9168);
  assert.strictEqual(res.totalRepayment, 9168 * 12);
});

// Amortization schedule balances decrement to 0
runTest('Amortization Schedule: balances decrement to exactly 0 at loan maturity', () => {
  const res = calculateEMI(500000, 10.5, 24);
  assert.strictEqual(res.monthlyScheduleSample.length, 24);
  const lastInstallment = res.monthlyScheduleSample[23];
  assert.strictEqual(lastInstallment.remainingBalance, 0);
});

// Invalid inputs throw errors
runTest('EMI Validation: negative principal throws error', () => {
  assert.throws(() => calculateEMI(-100000, 10, 12), /positive numbers/);
});

runTest('EMI Validation: negative interest rate throws error', () => {
  assert.throws(() => calculateEMI(100000, -5, 12), /0 or a positive number/);
});

runTest('EMI Validation: zero tenure throws error', () => {
  assert.throws(() => calculateEMI(100000, 10, 0), /positive numbers/);
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n=============================================================');
console.log(`  FINAI FINANCIAL AUDIT: ${passedTests} PASSED, ${failedTests} FAILED  `);
console.log('=============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
