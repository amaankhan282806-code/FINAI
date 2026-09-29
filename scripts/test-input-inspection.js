const { spawn } = require('child_process');
const http = require('http');
const app = require('../server');

async function testTyping() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const cdpPort = 9335;

  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=' + cdpPort,
    '--user-data-dir=C:/Users/Saif/AppData/Local/Temp/chrome_type_test_' + Date.now(),
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900'
  ]);

  let v = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + cdpPort + '/json/version');
      if (res.ok) { v = await res.json(); break; }
    } catch (e) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const tabRes = await fetch('http://127.0.0.1:' + cdpPort + '/json/new', { method: 'PUT' });
  const tab = await tabRes.json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 0;
  const send = (m, p = {}) => new Promise((res, rej) => {
    const curId = ++id;
    const h = (evt) => {
      const d = JSON.parse(evt.data);
      if (d.id === curId) {
        ws.removeEventListener('message', h);
        if (d.error) rej(new Error(d.error.message)); else res(d.result);
      }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: curId, method: m, params: p }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:' + port + '/register.html' });
  await new Promise(r => setTimeout(r, 800));

  // Check element overlap for all inputs on register.html
  const overlapRegister = await send('Runtime.evaluate', {
    expression: `(() => {
      const inputs = ['reg-fullName', 'reg-email', 'reg-password', 'reg-confirmPassword', 'btn-register-submit'];
      return inputs.map(id => {
        const el = document.getElementById(id);
        if (!el) return { id, exists: false };
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const topEl = document.elementFromPoint(centerX, centerY);
        return {
          id,
          exists: true,
          disabled: el.disabled,
          readOnly: el.readOnly,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          topElementTag: topEl ? topEl.tagName : null,
          topElementId: topEl ? topEl.id : null,
          isSelfOrChild: topEl === el || (el.contains && el.contains(topEl))
        };
      });
    })()`,
    returnByValue: true
  });

  console.log('Overlap check on /register.html:', JSON.stringify(overlapRegister.result.value, null, 2));

  // Type real keystrokes into every field
  console.log('Testing real keystroke typing into register fields:');
  
  // 1. Full name
  await send('Runtime.evaluate', { expression: `document.getElementById('reg-fullName').focus()` });
  for (const char of 'Amaan Khan') {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: char, unmodifiedText: char });
    await send('Input.dispatchKeyEvent', { type: 'keyUp' });
  }

  // 2. Email
  const testEmail = `amaan.${Date.now()}@finai.bank`;
  await send('Runtime.evaluate', { expression: `document.getElementById('reg-email').focus()` });
  for (const char of testEmail) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: char, unmodifiedText: char });
    await send('Input.dispatchKeyEvent', { type: 'keyUp' });
  }

  // 3. Password
  const testPwd = 'FinaiSecure2026!';
  await send('Runtime.evaluate', { expression: `document.getElementById('reg-password').focus()` });
  for (const char of testPwd) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: char, unmodifiedText: char });
    await send('Input.dispatchKeyEvent', { type: 'keyUp' });
  }

  // 4. Confirm Password
  await send('Runtime.evaluate', { expression: `document.getElementById('reg-confirmPassword').focus()` });
  for (const char of testPwd) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: char, unmodifiedText: char });
    await send('Input.dispatchKeyEvent', { type: 'keyUp' });
  }

  const valuesEntered = await send('Runtime.evaluate', {
    expression: `({
      fullName: document.getElementById('reg-fullName').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value,
      confirmPassword: document.getElementById('reg-confirmPassword').value
    })`,
    returnByValue: true
  });
  console.log('Values entered via real keyboard input:', valuesEntered.result.value);

  // Submit the form
  await send('Runtime.evaluate', {
    expression: `document.getElementById('register-form').dispatchEvent(new Event('submit', { cancelable: true }))`
  });
  await new Promise(r => setTimeout(r, 1200));

  const urlAfterReg = await send('Runtime.evaluate', {
    expression: `window.location.href`,
    returnByValue: true
  });
  console.log('URL after register form submit:', urlAfterReg.result.value);

  // Check login.html inputs
  await send('Page.navigate', { url: 'http://localhost:' + port + '/login.html' });
  await new Promise(r => setTimeout(r, 800));

  const overlapLogin = await send('Runtime.evaluate', {
    expression: `(() => {
      const inputs = ['auth-email', 'auth-password', 'btn-auth-submit', 'btn-demo-action'];
      return inputs.map(id => {
        const el = document.getElementById(id);
        if (!el) return { id, exists: false };
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const topEl = document.elementFromPoint(centerX, centerY);
        return {
          id,
          exists: true,
          disabled: el.disabled,
          readOnly: el.readOnly,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          topElementTag: topEl ? topEl.tagName : null,
          topElementId: topEl ? topEl.id : null,
          isSelfOrChild: topEl === el || (el.contains && el.contains(topEl))
        };
      });
    })()`,
    returnByValue: true
  });
  console.log('Overlap check on /login.html:', JSON.stringify(overlapLogin.result.value, null, 2));

  // Check Google Sign In button does NOT exist
  const hasGoogle = await send('Runtime.evaluate', {
    expression: `Boolean(document.getElementById('btn-google-signin') || document.querySelector('.btn-google') || document.body.innerHTML.includes('Continue with Google'))`,
    returnByValue: true
  });
  console.log('Google Sign-In button present in login.html:', hasGoogle.result.value);

  ws.close();
  chrome.kill();
  server.close();
}

testTyping().catch(console.error);
