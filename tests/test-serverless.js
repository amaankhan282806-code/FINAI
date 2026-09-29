/**
 * FINAI Serverless & Storage Regression Test Suite
 * Simulates Vercel execution environment to verify:
 * 1. No attempt to mkdir /var/task/data
 * 2. Proper use of os.tmpdir() (/tmp)
 * 3. api/index.js exports express application handler
 * 4. In-memory data store resilience
 * 5. Full API request/response cycle in simulated serverless mode
 */

const assert = require('assert');
const os = require('os');
const path = require('path');
const http = require('http');

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

async function runServerlessTests() {
  console.log('\n======================================================');
  console.log('   FINAI VERCEL SERVERLESS & STORAGE VERIFICATION     ');
  console.log('======================================================\n');

  // Test 1: Simulate VERCEL=1 environment variable
  process.env.VERCEL = '1';

  it('StorageService resolves to /tmp (os.tmpdir) under Vercel environment', () => {
    // Clear require cache to re-instantiate with VERCEL=1
    const storagePath = require.resolve('../server/services/storageService');
    delete require.cache[storagePath];
    const storageService = require('../server/services/storageService');

    const expectedDir = path.join(os.tmpdir(), 'finai-data');
    assert.strictEqual(storageService.dataDir, expectedDir, `Expected ${expectedDir}, got ${storageService.dataDir}`);
    assert.ok(!storageService.dataDir.includes('/var/task'), 'Storage dir must NOT point to /var/task');
  });

  it('StorageService does not crash on read/write in serverless environment', () => {
    const storageService = require('../server/services/storageService');

    // Test saving application
    const appRecord = storageService.saveApplication({
      fullName: 'Vercel Test Candidate',
      monthlySalary: 60000,
      creditScore: 750,
      existingEmi: 5000,
      status: 'ELIGIBLE'
    });

    assert.ok(appRecord.id, 'Record must have an ID');
    assert.strictEqual(appRecord.fullName, 'Vercel Test Candidate');

    // Test reading back
    const apps = storageService.getApplications();
    assert.ok(apps.length > 0, 'Applications must not be empty');
    const found = apps.find(a => a.id === appRecord.id);
    assert.ok(found, 'Saved application must be retrievable');

    // Test user creation
    const user = storageService.createUser({
      fullName: 'Test User',
      email: `test-${Date.now()}@finai.test`,
      passwordHash: 'dummy_hash'
    });
    assert.ok(user.id, 'User must have an ID');
    const foundUser = storageService.findUserByEmail(user.email);
    assert.ok(foundUser, 'User must be retrievable by email');
  });

  it('api/index.js exports a callable Express application handler', () => {
    const apiHandler = require('../api/index');
    assert.strictEqual(typeof apiHandler, 'function', 'api/index.js must export a callable function (Express app)');
    assert.strictEqual(typeof apiHandler.handle, 'function', 'Express app must have handle method');
  });

  it('server.js exports app directly as default export', () => {
    const serverModule = require('../server');
    assert.strictEqual(typeof serverModule, 'function', 'server.js default export must be Express app function');
    assert.strictEqual(typeof serverModule.app, 'function', 'server.js .app must be Express app function');
  });

  console.log('\n--- Serverless Request Dispatch & API Verification ---');

  const app = require('../server');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  async function api(url, options = {}) {
    const res = await fetch(`${baseUrl}${url}`, options);
    const text = await res.text();
    let body = {};
    try {
      body = JSON.parse(text);
    } catch (e) {
      body = { raw: text };
    }
    return { status: res.status, body };
  }

  try {
    await itAsync('GET /api/health returns 200 UP in serverless mode', async () => {
      const res = await api('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'UP');
    });

    await itAsync('POST /api/eligibility/check evaluates properly without /var/task error', async () => {
      const res = await api('/api/eligibility/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Amaan Khan',
          age: 27,
          monthlySalary: 90000,
          employmentType: 'Salaried',
          creditScore: 780,
          existingEmi: 10000,
          desiredLoanAmount: 1800000,
          loanTenureMonths: 60
        })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.isEligible, true);
      assert.strictEqual(res.body.data.indicativeEligibleAmount, 1800000);
    });

    await itAsync('POST /api/emi/calculate returns valid computation', async () => {
      const res = await api('/api/emi/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanAmount: 500000,
          annualInterestRate: 11.5,
          tenureMonths: 36
        })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.monthlyEmi > 0);
    });

    await itAsync('POST /api/credit/analyze returns credit score breakdown', async () => {
      const res = await api('/api/credit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditScore: 790,
          creditUtilization: 18
        })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.category, 'Excellent');
    });

    await itAsync('GET /api/applications returns seeded application history', async () => {
      const res = await api('/api/applications');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.length >= 3);
    });

    await itAsync('POST /api/auth/demo logs in demo user', async () => {
      const res = await api('/api/auth/demo', { method: 'POST' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.token, 'Demo login must return JWT token');
    });

    await itAsync('Static clean URLs: GET /dashboard, /eligibility return 200 HTML', async () => {
      const resDash = await fetch(`${baseUrl}/dashboard`);
      assert.strictEqual(resDash.status, 200);
      const htmlDash = await resDash.text();
      assert.ok(htmlDash.includes('FINAI') || htmlDash.includes('Dashboard'));

      const resElig = await fetch(`${baseUrl}/eligibility`);
      assert.strictEqual(resElig.status, 200);
      const htmlElig = await resElig.text();
      assert.ok(htmlElig.includes('FINAI') || htmlElig.includes('Eligibility'));
    });

  } finally {
    server.close();
  }

  console.log('\n======================================================');
  console.log(`  SERVERLESS RESULTS: ${passed} PASSED, ${failed} FAILED  `);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runServerlessTests();
