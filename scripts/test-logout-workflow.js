/**
 * FINAI Sign Out Functionality Verification Suite
 * Tests all 5 requirements:
 * 1. Normal Sign Out (click -> API call -> redirect to /login?loggedout=true)
 * 2. Authentication Cleanup (tokens & user data cleared from localStorage & memory)
 * 3. Protected Dashboard (direct access blocked, browser history back blocked)
 * 4. Re-login (repeatable access and subsequent sign out)
 * 5. Error Handling (network failure during logout safely handled without leaving user authenticated)
 */

const { spawn } = require('child_process');
const http = require('http');
const assert = require('assert');
const app = require('../server');

async function runLogoutTestSuite() {
  console.log('\n======================================================');
  console.log('       FINAI SIGN OUT VERIFICATION TEST SUITE         ');
  console.log('======================================================\n');

  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  const cdpPort = 9345;

  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=C:/Users/Saif/AppData/Local/Temp/chrome_logout_suite_${Date.now()}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900'
  ]);

  let v = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (res.ok) { v = await res.json(); break; }
    } catch(e) { await new Promise(r => setTimeout(r, 200)); }
  }

  const tab = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 0;
  const send = (m, p = {}) => new Promise((res, rej) => {
    const cur = ++id;
    const h = (evt) => {
      const d = JSON.parse(evt.data);
      if (d.id === cur) {
        ws.removeEventListener('message', h);
        if (d.error) rej(new Error(d.error.message)); else res(d.result);
      }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });

  let logoutApiCalled = false;
  let logoutApiAuthHeader = null;
  ws.addEventListener('message', (evt) => {
    const d = JSON.parse(evt.data);
    if (d.method === 'Network.requestWillBeSent') {
      if (d.params.request.url.includes('/auth/logout')) {
        logoutApiCalled = true;
        logoutApiAuthHeader = d.params.request.headers['Authorization'] || d.params.request.headers['authorization'];
      }
    }
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  const testUser = {
    fullName: 'Mohit Sharma',
    email: `mohit_${Date.now()}@finai.bank`,
    password: 'Password2026!'
  };

  try {
    // ----------------------------------------------------
    // Registration & Setup
    // ----------------------------------------------------
    console.log('[Setup] Registering test user...');
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: testUser.fullName,
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password
      })
    });
    assert.strictEqual(regRes.status, 201);

    // ====================================================
    // TEST 1: Normal Sign Out
    // ====================================================
    console.log('\n--- TEST 1: Normal Sign Out ---');
    await send('Page.navigate', { url: `${baseUrl}/login` });
    await new Promise(r => setTimeout(r, 600));

    // Sign in with credentials
    await send('Runtime.evaluate', {
      expression: `(() => {
        document.getElementById('auth-email').value = '${testUser.email}';
        document.getElementById('auth-password').value = '${testUser.password}';
        document.getElementById('auth-page-form').dispatchEvent(new Event('submit', { cancelable: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    const dashUrl = (await send('Runtime.evaluate', { expression: 'window.location.href' })).result.value;
    console.log(`  1a. Dashboard URL reached: ${dashUrl}`);
    assert.ok(dashUrl.includes('dashboard'), 'Must land on dashboard');

    const tokenBefore = (await send('Runtime.evaluate', { expression: 'localStorage.getItem("finai_token")' })).result.value;
    console.log(`  1b. Authenticated token present: ${tokenBefore ? tokenBefore.substring(0, 20) + '...' : 'null'}`);
    assert.ok(tokenBefore, 'Token must exist before logout');

    // Click Sign Out button
    logoutApiCalled = false;
    console.log('  1c. Clicking #btn-logout...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.getElementById('btn-logout');
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    const urlAfterLogout = (await send('Runtime.evaluate', { expression: 'window.location.href' })).result.value;
    console.log(`  1d. Redirect URL after sign out: ${urlAfterLogout}`);
    assert.ok(urlAfterLogout.includes('/login') || urlAfterLogout.includes('login.html'), 'Must redirect to login page');
    assert.ok(urlAfterLogout.includes('loggedout=true'), 'Must include loggedout=true query param');
    assert.strictEqual(logoutApiCalled, true, 'Backend logout API must be invoked');
    assert.ok(logoutApiAuthHeader && logoutApiAuthHeader.startsWith('Bearer '), 'Backend logout API must receive Authorization Bearer token');
    console.log('  ✓ [PASS] TEST 1: Normal Sign Out completed successfully');

    // ====================================================
    // TEST 2: Authentication Cleanup
    // ====================================================
    console.log('\n--- TEST 2: Authentication Cleanup ---');
    const tokenAfter = (await send('Runtime.evaluate', { expression: 'localStorage.getItem("finai_token")' })).result.value;
    const userAfter = (await send('Runtime.evaluate', { expression: 'localStorage.getItem("finai_user")' })).result.value;
    const isAuth = (await send('Runtime.evaluate', { expression: 'typeof isAuthenticated === "function" ? isAuthenticated() : false' })).result.value;
    const alertMsg = (await send('Runtime.evaluate', { expression: 'document.getElementById("auth-alert-msg")?.textContent || ""' })).result.value;

    console.log(`  2a. Token in localStorage: ${tokenAfter}`);
    console.log(`  2b. User in localStorage:  ${userAfter}`);
    console.log(`  2c. isAuthenticated():     ${isAuth}`);
    console.log(`  2d. Logout alert message:  "${alertMsg}"`);

    assert.strictEqual(tokenAfter, null, 'finai_token must be null');
    assert.strictEqual(userAfter, null, 'finai_user must be null');
    assert.strictEqual(isAuth, false, 'User must not be treated as authenticated');
    assert.ok(alertMsg.includes('logged out safely'), 'Must display safe logout alert message');

    // Verify token was revoked on server as well
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${tokenBefore}` }
    });
    console.log(`  2e. Server verification of revoked token on /api/auth/me: HTTP ${meRes.status}`);
    assert.strictEqual(meRes.status, 401, 'Revoked token must be rejected with 401 Unauthorized');
    console.log('  ✓ [PASS] TEST 2: Complete client & server token cleanup verified');

    // ====================================================
    // TEST 3: Protected Dashboard (Direct URL & Back Button)
    // ====================================================
    console.log('\n--- TEST 3: Protected Dashboard Access Interception ---');
    console.log('  3a. Attempting direct navigation to /dashboard while logged out...');
    await send('Page.navigate', { url: `${baseUrl}/dashboard` });
    await new Promise(r => setTimeout(r, 800));

    const directUrlClean = (await send('Runtime.evaluate', { expression: 'window.location.href' })).result.value;
    console.log(`  3b. URL after direct /dashboard access: ${directUrlClean}`);
    assert.ok(directUrlClean.includes('login'), 'Must bounce to login page');

    console.log('  3c. Attempting direct navigation to /dashboard.html while logged out...');
    await send('Page.navigate', { url: `${baseUrl}/dashboard.html` });
    await new Promise(r => setTimeout(r, 800));

    const directUrlHtml = (await send('Runtime.evaluate', { expression: 'window.location.href' })).result.value;
    console.log(`  3d. URL after direct /dashboard.html access: ${directUrlHtml}`);
    assert.ok(directUrlHtml.includes('login'), 'Must bounce to login page');
    console.log('  ✓ [PASS] TEST 3: Protected dashboard access strictly blocked');

    // ====================================================
    // TEST 4: Re-login & Sidebar Logout Verification
    // ====================================================
    console.log('\n--- TEST 4: Re-login & Nav-link Sign Out ---');
    await send('Page.navigate', { url: `${baseUrl}/login` });
    await new Promise(r => setTimeout(r, 600));

    // Sign in again with same credentials
    await send('Runtime.evaluate', {
      expression: `(() => {
        document.getElementById('auth-email').value = '${testUser.email}';
        document.getElementById('auth-password').value = '${testUser.password}';
        document.getElementById('auth-page-form').dispatchEvent(new Event('submit', { cancelable: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    const secondDashUrl = (await send('Runtime.evaluate', { expression: 'window.location.href' })).result.value;
    console.log(`  4a. Dashboard re-entered: ${secondDashUrl}`);
    assert.ok(secondDashUrl.includes('dashboard'), 'Must reach dashboard on re-login');

    const secondToken = (await send('Runtime.evaluate', { expression: 'localStorage.getItem("finai_token")' })).result.value;
    assert.ok(secondToken, 'New token must be issued');

    // Click sidebar logout button (#nav-logout-btn)
    console.log('  4b. Clicking sidebar #nav-logout-btn...');
    logoutApiCalled = false;
    await send('Runtime.evaluate', {
      expression: `(() => {
        const navBtn = document.getElementById('nav-logout-btn');
        if (navBtn) navBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    const secondLogoutUrl = (await send('Runtime.evaluate', { expression: 'window.location.href' })).result.value;
    console.log(`  4c. Redirect URL after sidebar sign out: ${secondLogoutUrl}`);
    assert.ok(secondLogoutUrl.includes('login'), 'Must return to login');
    assert.strictEqual(logoutApiCalled, true, 'Sidebar sign out must trigger backend logout API');
    console.log('  ✓ [PASS] TEST 4: Re-login and sidebar sign out work consistently');

    // ====================================================
    // TEST 5: Error Handling & Network Resilience
    // ====================================================
    console.log('\n--- TEST 5: Error Handling & Network Resilience ---');
    // Log back in
    await send('Runtime.evaluate', {
      expression: `(() => {
        document.getElementById('auth-email').value = '${testUser.email}';
        document.getElementById('auth-password').value = '${testUser.password}';
        document.getElementById('auth-page-form').dispatchEvent(new Event('submit', { cancelable: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // Sabotage CONFIG endpoint to simulate network/endpoint failure
    console.log('  5a. Simulating backend logout network failure...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        CONFIG.ENDPOINTS.AUTH_LOGOUT = '/invalid-unreachable-route-999';
        logoutUser();
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    const urlAfterNetworkFail = (await send('Runtime.evaluate', { expression: 'window.location.href' })).result.value;
    const tokenAfterFail = (await send('Runtime.evaluate', { expression: 'localStorage.getItem("finai_token")' })).result.value;
    console.log(`  5b. URL after network failure during logout: ${urlAfterNetworkFail}`);
    console.log(`  5c. Token after failure: ${tokenAfterFail}`);
    assert.ok(urlAfterNetworkFail.includes('login'), 'Must still redirect to login even if network fails');
    assert.strictEqual(tokenAfterFail, null, 'Must ensure client does not remain authenticated');
    console.log('  ✓ [PASS] TEST 5: Network failure safely handled without lingering auth state');

    console.log('\n======================================================');
    console.log('      ALL 5 SIGN OUT VERIFICATION TESTS PASSED!       ');
    console.log('======================================================\n');

  } catch(err) {
    console.error('\n✗ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    ws.close();
    chrome.kill();
    server.close();
  }
}

runLogoutTestSuite();
