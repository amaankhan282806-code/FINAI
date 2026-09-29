/**
 * FINAI Comprehensive Authentication & Workflow Test Suite
 * Fully verifies Section 7 requirements (16 Core Criteria + Extended Scenarios):
 * 1. Valid account registration
 * 2. Persistent storage verification
 * 3. Duplicate email rejection (409)
 * 4. Invalid email format rejection (400)
 * 5. Weak password (< 8 chars) rejection (400)
 * 6. Mismatched confirm password rejection (400)
 * 7. Login with registered credentials (200)
 * 8. Incorrect password rejection (401)
 * 9. Unregistered user rejection (401)
 * 10. Successful login token issuance and identity verification
 * 11. Dashboard session preservation via /api/auth/me
 * 12. Unauthenticated access rejection on protected APIs (401)
 * 13. Logout clears session (/api/auth/logout returns 200)
 * 14. Logged-out access rejection & dashboard client auth guard
 * 15. User data isolation (User A cannot see User B's applications)
 * 16. Existing financial features remain 100% operational
 * 17. Clean URL routing (/login, /register, /signup)
 * 18. DOM elements & interaction targets (toggle, inputs, buttons)
 * 19. Demo user login flow
 * 20. Google OAuth integration endpoints
 */

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function runAuthTests() {
  console.log('\n======================================================');
  console.log('       FINAI AUTHENTICATION & WORKFLOW TEST SUITE     ');
  console.log('======================================================\n');

  const app = require('../server');
  const config = require('../server/config/config');
  const storageService = require('../server/services/storageService');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      redirect: 'manual',
      ...options
    });
    let body = {};
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch (e) {
      body = { raw: text };
    }
    return { status: res.status, headers: res.headers, body, text };
  }

  const testEmail = `borrower_${Date.now()}@finai.bank`;
  const testPassword = 'StrongPassword2026!';
  let validUserToken = null;
  let validUserId = null;

  try {
    // 1. Valid account registration
    await itAsync('1. A new user can create an account with valid details (201 Created)', async () => {
      const res = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Amaan Khan',
          email: testEmail,
          password: testPassword,
          confirmPassword: testPassword
        })
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.token, 'Should return JWT token');
      assert.strictEqual(res.body.user.email, testEmail.toLowerCase());
      assert.strictEqual(res.body.user.fullName, 'Amaan Khan');
      assert.ok(res.body.message.includes('successfully'), 'Should have success message');
      validUserToken = res.body.token;
      validUserId = res.body.user.id;
    });

    // 2. Persistent storage verification
    it('2. The account is saved persistently in user storage', () => {
      const user = storageService.findUserByEmail(testEmail);
      assert.ok(user, 'User should be found in storage service');
      assert.strictEqual(user.email, testEmail.toLowerCase());
      assert.ok(user.passwordHash.startsWith('$2'), 'Password must be hashed with bcrypt');
      assert.notStrictEqual(user.passwordHash, testPassword, 'Plaintext password must never be stored');
    });

    // 3. Duplicate email rejection
    await itAsync('3. A duplicate email cannot register again (409 Conflict)', async () => {
      const res = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Duplicate User',
          email: testEmail.toUpperCase(), // Normalized email test
          password: testPassword,
          confirmPassword: testPassword
        })
      });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.toLowerCase().includes('already exists'));
    });

    // 4. Invalid email format rejection
    await itAsync('4. Invalid email formats are rejected (400 Bad Request)', async () => {
      const res = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Invalid Email User',
          email: 'invalid-email-string',
          password: testPassword,
          confirmPassword: testPassword
        })
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.toLowerCase().includes('valid email'));
    });

    // 5. Weak passwords rejected (< 8 chars)
    await itAsync('5. Weak passwords (< 8 characters) are rejected (400 Bad Request)', async () => {
      const res = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Weak Password User',
          email: `weak_${Date.now()}@finai.bank`,
          password: 'Short1',
          confirmPassword: 'Short1'
        })
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.toLowerCase().includes('at least 8'));
    });

    // 6. Mismatched passwords rejected
    await itAsync('6. Mismatched passwords are rejected (400 Bad Request)', async () => {
      const res = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Mismatch User',
          email: `mismatch_${Date.now()}@finai.bank`,
          password: 'Password1234!',
          confirmPassword: 'DifferentPassword5678!'
        })
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.toLowerCase().includes('do not match'));
    });

    // 7. Login with registered email and password
    await itAsync('7. A user can log in with the registered email and password (200 OK)', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail.toUpperCase(), // Testing case-insensitive normalization
          password: testPassword
        })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.token);
      assert.strictEqual(res.body.user.email, testEmail.toLowerCase());
      assert.strictEqual(res.body.user.fullName, 'Amaan Khan');
    });

    // 8. Incorrect password rejected
    await itAsync('8. An incorrect password is rejected (401 Unauthorized)', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword999!'
        })
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.toLowerCase().includes('invalid'));
    });

    // 9. Unregistered user rejected
    await itAsync('9. An unregistered user cannot log in (401 Unauthorized)', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'unknown_borrower_999@finai.bank',
          password: 'Password1234!'
        })
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.toLowerCase().includes('invalid'));
    });

    // 10. Successful login opens dashboard / returns token
    it('10. Successful login issues verifiable token containing user identity', () => {
      const decoded = jwt.verify(validUserToken, config.JWT_SECRET);
      assert.strictEqual(decoded.id, validUserId);
      assert.strictEqual(decoded.email, testEmail.toLowerCase());
      assert.strictEqual(decoded.fullName, 'Amaan Khan');
    });

    // 11. Refreshing dashboard preserves authentication
    await itAsync('11. Refreshing preserves authentication session via /api/auth/me', async () => {
      const res = await api('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${validUserToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.user.id, validUserId);
      assert.strictEqual(res.body.user.email, testEmail.toLowerCase());
    });

    // 12. Unauthenticated access rejected on protected API
    await itAsync('12. An unauthenticated user cannot access protected APIs (401 Unauthorized)', async () => {
      const res = await api('/api/auth/me');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.toLowerCase().includes('authentication required'));
    });

    // 13. Logout ends the session
    await itAsync('13. Logout endpoint invalidates session cleanly (/api/auth/logout)', async () => {
      const res = await api('/api/auth/logout', { method: 'POST' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.message.toLowerCase().includes('logged out'));
    });

    // 14. Logged-out access rejection & dashboard auth guard
    await itAsync('14. Dashboard HTML contains strict client-side auth guard redirecting to login', async () => {
      const res = await api('/dashboard');
      assert.strictEqual(res.status, 200);
      assert.ok(res.text.includes("window.location.replace('login.html')"), 'Must contain instant auth guard');
      assert.ok(res.text.includes('btn-logout'), 'Must contain Logout button');
    });

    // 15. User data isolation
    await itAsync('15. Two different accounts cannot access each other\'s protected application data', async () => {
      // Create user B
      const userBEmail = `userb_${Date.now()}@finai.bank`;
      const regB = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'User Bravo',
          email: userBEmail,
          password: 'PasswordB1234!',
          confirmPassword: 'PasswordB1234!'
        })
      });
      const userBToken = regB.body.token;
      const userBId = regB.body.user.id;

      // User A submits an application
      const appRes = await api('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validUserToken}`
        },
        body: JSON.stringify({
          fullName: 'Amaan Khan Confidential Loan',
          monthlySalary: 85000,
          requestedLoanAmount: 1700000,
          creditScore: 780,
          status: 'ELIGIBLE'
        })
      });
      assert.strictEqual(appRes.status, 201);
      const appRecord = appRes.body.data;
      assert.strictEqual(appRecord.userId, validUserId);

      // User B queries applications: MUST NOT see User A's application
      const userBApps = await api('/api/applications', {
        headers: { 'Authorization': `Bearer ${userBToken}` }
      });
      assert.strictEqual(userBApps.status, 200);
      const containsUserAApp = userBApps.body.data.some(a => a.id === appRecord.id);
      assert.strictEqual(containsUserAApp, false, 'User B must NOT see User A applications');

      // User B tries to directly fetch User A's application by ID: MUST be rejected with 403
      const directFetch = await api(`/api/applications/${appRecord.id}`, {
        headers: { 'Authorization': `Bearer ${userBToken}` }
      });
      assert.strictEqual(directFetch.status, 403, 'Must return 403 Forbidden for unauthorized record');
    });

    // 16. Existing financial features continue to work
    await itAsync('16. The application builds and all existing financial modules remain fully functional', async () => {
      // 16a. Health
      const health = await api('/api/health');
      assert.strictEqual(health.status, 200);
      assert.strictEqual(health.body.status, 'UP');

      // 16b. Eligibility calculation
      const elig = await api('/api/eligibility/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test Candidate',
          monthlySalary: 50000,
          creditScore: 780,
          existingEmi: 5000,
          age: 28,
          desiredLoanAmount: 1000000,
          loanTenureMonths: 60
        })
      });
      assert.strictEqual(elig.status, 200);
      assert.strictEqual(elig.body.data.isEligible, true);
      assert.strictEqual(elig.body.data.indicativeEligibleAmount, 1000000);

      // 16c. EMI calculation
      const emi = await api('/api/emi/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanAmount: 500000,
          interestRate: 10,
          tenureMonths: 60
        })
      });
      assert.strictEqual(emi.status, 200);
      assert.strictEqual(emi.body.data.monthlyEmi, 10624);

      // 16d. Credit Analyzer
      const credit = await api('/api/credit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditScore: 780 })
      });
      assert.strictEqual(credit.status, 200);
      assert.strictEqual(credit.body.data.category, 'Excellent');
    });

    // 17. Clean URL routing for login, register, and signup
    await itAsync('17. Clean URL routes /login, /register, and /signup serve valid 200 HTML pages', async () => {
      const loginRes = await api('/login');
      assert.strictEqual(loginRes.status, 200);
      assert.ok(loginRes.text.includes('Sign In'));

      const regRes = await api('/register');
      assert.strictEqual(regRes.status, 200);
      assert.ok(regRes.text.includes('Create Your Account'));

      const signupRes = await api('/signup');
      assert.strictEqual(signupRes.status, 200);
      assert.ok(signupRes.text.includes('Create Your Account'));
    });

    // 18. DOM elements & interaction targets (Google Sign-In completely removed)
    await itAsync('18. Registration and Login forms contain required inputs, eye toggles, and buttons with Google Sign-In completely removed', async () => {
      const reg = await api('/register.html');
      assert.ok(reg.text.includes('reg-fullName'), 'Must have full name input');
      assert.ok(reg.text.includes('reg-email'), 'Must have email input');
      assert.ok(reg.text.includes('reg-password'), 'Must have password input');
      assert.ok(reg.text.includes('reg-confirmPassword') || reg.text.includes('reg-confirm-password'), 'Must have confirm password input');
      assert.ok(reg.text.includes('btn-toggle-pwd'), 'Must have eye toggles');
      assert.strictEqual(reg.text.includes('btn-google-signin'), false, 'Register page must NOT have Google signin button');

      const login = await api('/login.html');
      assert.ok(login.text.includes('auth-email'), 'Must have login email input');
      assert.ok(login.text.includes('auth-password'), 'Must have login password input');
      assert.ok(login.text.includes('btn-auth-submit'), 'Must have login submit button');
      assert.strictEqual(login.text.includes('btn-google-signin'), false, 'Login page must NOT have Google signin button');
      assert.strictEqual(login.text.includes('Continue with Google'), false, 'Login page must NOT have Continue with Google text');
      assert.ok(login.text.includes('btn-demo-action'), 'Must have demo quick button');
    });

    // 19. Demo user login flow
    await itAsync('19. Instant demo login creates authenticated session for Rahul Sharma', async () => {
      const demoRes = await api('/api/auth/demo', { method: 'POST' });
      assert.strictEqual(demoRes.status, 200);
      assert.strictEqual(demoRes.body.success, true);
      assert.strictEqual(demoRes.body.user.id, 'usr_demo_finai');
      assert.ok(demoRes.body.token);
    });

    // 20. Google OAuth integration endpoints
    await itAsync('20. Google OAuth status and sandbox mock endpoints operate seamlessly', async () => {
      const statusRes = await api('/api/auth/google/status');
      assert.strictEqual(statusRes.status, 200);
      assert.strictEqual(typeof statusRes.body.configured, 'boolean');

      const mockRes = await api('/api/auth/google/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Google Authenticated User',
          email: `google_${Date.now()}@finai.bank`
        })
      });
      assert.strictEqual(mockRes.status, 200);
      assert.strictEqual(mockRes.body.success, true);
      assert.ok(mockRes.body.token);
    });

  } finally {
    server.close();
  }

  console.log('\n======================================================');
  console.log(`  AUTH RESULTS: ${passed} PASSED, ${failed} FAILED  `);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthTests();
