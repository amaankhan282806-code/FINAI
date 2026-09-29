/**
 * FINAI End-to-End Browser Workflow Verification via Chrome DevTools Protocol (CDP)
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const evidenceDir = path.join(__dirname, '../audit-evidence');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function runBrowserWorkflow() {
  console.log('======================================================');
  console.log('  STARTING BROWSER E2E AUTHENTICATION WORKFLOW TEST   ');
  console.log('======================================================\n');

  // 1. Start Server
  const app = require('../server');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;
  const baseUrl = `http://localhost:${serverPort}`;
  console.log(`[1] Local FINAI server active on ${baseUrl}`);

  // 2. Launch Chrome
  const cdpPort = 9333;
  const userDataDir = path.join(evidenceDir, `chrome_test_profile_${Date.now()}`);
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900'
  ]);

  // Wait for CDP to be ready
  let versionData = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (!versionData || !versionData.webSocketDebuggerUrl) {
    console.error('Failed to connect to Chrome CDP.');
    chromeProcess.kill();
    server.close();
    process.exit(1);
  }

  console.log(`[2] Headless Chrome connected via CDP (${versionData.Browser})`);

  // Create a new tab
  const tabRes = await fetch(`http://127.0.0.1:${cdpPort}/json/new`, { method: 'PUT' });
  const tabData = await tabRes.json();
  const wsUrl = tabData.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let messageId = 0;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      const { resolve, reject } = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result ? res.result.value : null;
  }

  async function captureScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(evidenceDir, filename);
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`    ↳ Screenshot saved: ${filename}`);
  }

  async function navigate(url) {
    await send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 600));
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  const testUser = {
    fullName: 'Amaan Khan',
    email: `amaan.khan.${Date.now()}@finai.bank`,
    password: 'FinaiSecurePassword2026!'
  };

  try {
    // ---------------------------------------------------------
    // STEP A: Open Register Page
    // ---------------------------------------------------------
    console.log('\n[Step A] Loading /register.html page...');
    await navigate(`${baseUrl}/register.html`);
    const pageTitle = await evaluate('document.title');
    console.log(`  Page title: "${pageTitle}"`);
    await captureScreenshot('19_register_page.png');

    // ---------------------------------------------------------
    // STEP B: Fill and Submit Registration Form
    // ---------------------------------------------------------
    console.log(`\n[Step B] Filling registration form for "${testUser.fullName}" (${testUser.email})...`);
    await evaluate(`
      document.getElementById('reg-fullName').value = '${testUser.fullName}';
      document.getElementById('reg-email').value = '${testUser.email}';
      document.getElementById('reg-password').value = '${testUser.password}';
      const confInput = document.getElementById('reg-confirmPassword') || document.getElementById('reg-confirm-password');
      if (confInput) confInput.value = '${testUser.password}';
      document.getElementById('register-form').dispatchEvent(new Event('submit', { cancelable: true }));
    `);

    // Wait for the redirection to login.html
    console.log('  Waiting for registration API response & redirect to login.html...');
    await new Promise(r => setTimeout(r, 1500));

    const currentUrlAfterReg = await evaluate('window.location.href');
    console.log(`  Current URL after registration: ${currentUrlAfterReg}`);
    const alertMsg = await evaluate(`document.getElementById('auth-alert-msg')?.textContent || ''`);
    const prefilledEmail = await evaluate(`document.getElementById('auth-email')?.value || ''`);
    console.log(`  Alert banner message: "${alertMsg}"`);
    console.log(`  Prefilled email on login page: "${prefilledEmail}"`);
    await captureScreenshot('20_registered_success_login.png');

    if (!currentUrlAfterReg.includes('login.html') || !currentUrlAfterReg.includes('registered=true')) {
      throw new Error(`Expected redirect to login.html?registered=true, got: ${currentUrlAfterReg}`);
    }

    // ---------------------------------------------------------
    // STEP C: Login using Registered Credentials
    // ---------------------------------------------------------
    console.log('\n[Step C] Entering password and signing in...');
    await evaluate(`
      document.getElementById('auth-password').value = '${testUser.password}';
      document.getElementById('auth-page-form').dispatchEvent(new Event('submit', { cancelable: true }));
    `);

    // Wait for login API call & dashboard redirect
    console.log('  Waiting for login authentication & redirect to dashboard.html...');
    await new Promise(r => setTimeout(r, 1500));

    const currentUrlAfterLogin = await evaluate('window.location.href');
    console.log(`  Current URL after sign-in: ${currentUrlAfterLogin}`);
    const welcomeText = await evaluate(`document.getElementById('welcome-name')?.textContent || ''`);
    const userDisplay = await evaluate(`document.getElementById('user-display-name')?.textContent || ''`);
    console.log(`  Dashboard Welcome Hero Name: "${welcomeText}"`);
    console.log(`  Dashboard Topbar User Name:  "${userDisplay}"`);
    await captureScreenshot('21_authenticated_dashboard.png');

    if (!currentUrlAfterLogin.includes('dashboard.html')) {
      throw new Error(`Expected redirect to dashboard.html, got: ${currentUrlAfterLogin}`);
    }

    // ---------------------------------------------------------
    // STEP D: Logout Flow
    // ---------------------------------------------------------
    console.log('\n[Step D] Clicking Sign Out button on Dashboard...');
    await evaluate(`logoutUser();`);
    await new Promise(r => setTimeout(r, 800));

    const currentUrlAfterLogout = await evaluate('window.location.href');
    console.log(`  Current URL after logout: ${currentUrlAfterLogout}`);
    const tokenInStorage = await evaluate(`localStorage.getItem('finai_token')`);
    const userInStorage = await evaluate(`localStorage.getItem('finai_user')`);
    console.log(`  Token in localStorage after logout: ${tokenInStorage}`);
    console.log(`  User in localStorage after logout: ${userInStorage}`);
    await captureScreenshot('22_logged_out_redirect.png');

    if (!currentUrlAfterLogout.includes('login.html')) {
      throw new Error(`Expected redirect to login.html after logout, got: ${currentUrlAfterLogout}`);
    }
    if (tokenInStorage !== null) {
      throw new Error('Token was not cleared from localStorage after logout!');
    }

    // ---------------------------------------------------------
    // STEP E: Attempt Direct Access to Dashboard while Logged Out
    // ---------------------------------------------------------
    console.log('\n[Step E] Attempting direct access to /dashboard.html while logged out...');
    await navigate(`${baseUrl}/dashboard.html`);
    await new Promise(r => setTimeout(r, 800));

    const currentUrlBlocked = await evaluate('window.location.href');
    console.log(`  URL after direct /dashboard.html attempt: ${currentUrlBlocked}`);
    await captureScreenshot('23_direct_dashboard_blocked.png');

    if (!currentUrlBlocked.includes('login.html')) {
      throw new Error(`Unauthenticated user was not bounced to login.html! Current URL: ${currentUrlBlocked}`);
    }
    console.log('  ✓ Client auth guard strictly blocked direct access to protected dashboard.');

    // ---------------------------------------------------------
    // STEP F: Re-login with the same Registered Credentials
    // ---------------------------------------------------------
    console.log('\n[Step F] Signing in again with the registered credentials to confirm repeatable access...');
    await evaluate(`
      document.getElementById('auth-email').value = '${testUser.email}';
      document.getElementById('auth-password').value = '${testUser.password}';
      document.getElementById('auth-page-form').dispatchEvent(new Event('submit', { cancelable: true }));
    `);
    await new Promise(r => setTimeout(r, 1200));

    const currentUrlSecondLogin = await evaluate('window.location.href');
    console.log(`  Current URL after second sign-in: ${currentUrlSecondLogin}`);
    const secondWelcome = await evaluate(`document.getElementById('welcome-name')?.textContent || ''`);
    console.log(`  Dashboard Welcome Hero: "${secondWelcome}"`);
    await captureScreenshot('24_reauthenticated_dashboard.png');

    if (!currentUrlSecondLogin.includes('dashboard.html')) {
      throw new Error(`Second sign-in failed to reach dashboard.html, got: ${currentUrlSecondLogin}`);
    }

    console.log('\n======================================================');
    console.log('  ALL BROWSER WORKFLOW VERIFICATION STEPS PASSED!      ');
    console.log('======================================================\n');

  } catch (err) {
    console.error('\n✗ BROWSER WORKFLOW FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    ws.close();
    chromeProcess.kill();
    server.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

runBrowserWorkflow();
