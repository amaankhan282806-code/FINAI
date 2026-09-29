/**
 * FINAI Automated UI Verification & Screenshot Evidence Capture Script
 * Uses Chrome DevTools Protocol (CDP) natively without external dependencies.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EVIDENCE_DIR = path.join(__dirname, '..', 'audit-evidence');
const DEBUG_PORT = 9222;

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function run() {
  console.log('--- Starting Headless Chrome for Audit Evidence Capture ---');
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=1920,1080'
  ]);

  await wait(2000);

  try {
    async function capturePage({ url, viewport, filename, evaluateScript, waitBeforeShot = 1000 }) {
      console.log(`Capturing: ${filename} (${viewport.width}x${viewport.height}) -> ${url}`);
      
      // Create new target
      const newTargetRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
      const target = await newTargetRes.json();
      
      const client = new CDPClient(target.webSocketDebuggerUrl);
      await client.connect();
      await client.send('Page.enable');
      await client.send('DOM.enable');
      await client.send('Runtime.enable');

      // Set viewport
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: !!viewport.mobile
      });

      await wait(waitBeforeShot);

      if (evaluateScript) {
        await client.send('Runtime.evaluate', {
          expression: evaluateScript,
          awaitPromise: true
        });
        await wait(1500);
      }

      // Capture screenshot
      const shotResult = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
      });

      const buffer = Buffer.from(shotResult.data, 'base64');
      const targetFile = path.join(EVIDENCE_DIR, filename);
      fs.writeFileSync(targetFile, buffer);
      console.log(`  ✓ Saved: ${targetFile} (${(buffer.length / 1024).toFixed(1)} KB)`);

      await client.close();
      await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${target.id}`);
    }

    // 1. Landing Page Across Viewports
    await capturePage({
      url: 'http://localhost:5000/',
      viewport: { width: 1920, height: 1080 },
      filename: '01_landing_desktop_1920x1080.png'
    });

    await capturePage({
      url: 'http://localhost:5000/',
      viewport: { width: 1366, height: 768 },
      filename: '02_landing_laptop_1366x768.png'
    });

    await capturePage({
      url: 'http://localhost:5000/',
      viewport: { width: 768, height: 1024, mobile: true },
      filename: '03_landing_tablet_768x1024.png'
    });

    await capturePage({
      url: 'http://localhost:5000/',
      viewport: { width: 375, height: 812, mobile: true },
      filename: '04_landing_mobile_375x812.png'
    });

    await capturePage({
      url: 'http://localhost:5000/',
      viewport: { width: 390, height: 844, mobile: true },
      filename: '05_landing_mobile_390x844.png'
    });

    // 2. Loan Eligibility Checker
    await capturePage({
      url: 'http://localhost:5000/eligibility',
      viewport: { width: 1920, height: 1080 },
      filename: '06_eligibility_form_initial.png'
    });

    // Test Case 1: Eligible scenario (50k, 780, 5k, 25)
    await capturePage({
      url: 'http://localhost:5000/eligibility',
      viewport: { width: 1920, height: 1080 },
      filename: '07_eligibility_test1_eligible.png',
      evaluateScript: `
        (async () => {
          document.getElementById('name').value = 'Amaan Khan';
          document.getElementById('salary').value = '50000';
          document.getElementById('score').value = '780';
          document.getElementById('emiInput').value = '5000';
          document.getElementById('age').value = '25';
          if (document.getElementById('employmentType')) document.getElementById('employmentType').value = 'Salaried';
          if (document.getElementById('loanAmount')) document.getElementById('loanAmount').value = '1000000';
          if (document.getElementById('tenure')) document.getElementById('tenure').value = '60';
          
          const form = document.getElementById('eligibilityForm') || document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        })()
      `,
      waitBeforeShot: 800
    });

    // Test Case 2: Rejected boundary scenario (30k salary)
    await capturePage({
      url: 'http://localhost:5000/eligibility',
      viewport: { width: 1920, height: 1080 },
      filename: '08_eligibility_test2_rejected.png',
      evaluateScript: `
        (async () => {
          document.getElementById('name').value = 'Boundary Candidate';
          document.getElementById('salary').value = '30000';
          document.getElementById('score').value = '780';
          document.getElementById('emiInput').value = '5000';
          document.getElementById('age').value = '25';
          
          const form = document.getElementById('eligibilityForm') || document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        })()
      `,
      waitBeforeShot: 800
    });

    // 3. Credit Score Analyzer
    await capturePage({
      url: 'http://localhost:5000/credit-analyzer',
      viewport: { width: 1920, height: 1080 },
      filename: '09_credit_analyzer_form.png'
    });

    await capturePage({
      url: 'http://localhost:5000/credit-analyzer',
      viewport: { width: 1920, height: 1080 },
      filename: '10_credit_analyzer_result.png',
      evaluateScript: `
        (async () => {
          const scoreEl = document.getElementById('creditScore') || document.getElementById('score') || document.querySelector('input[type="number"]');
          if (scoreEl) scoreEl.value = '780';
          const form = document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          } else {
            const btn = document.querySelector('button[type="submit"]') || document.querySelector('.btn-primary');
            if (btn) btn.click();
          }
        })()
      `,
      waitBeforeShot: 800
    });

    // 4. EMI Calculator
    await capturePage({
      url: 'http://localhost:5000/emi-calculator',
      viewport: { width: 1920, height: 1080 },
      filename: '11_emi_calculator_form.png'
    });

    await capturePage({
      url: 'http://localhost:5000/emi-calculator',
      viewport: { width: 1920, height: 1080 },
      filename: '12_emi_calculator_result.png',
      evaluateScript: `
        (async () => {
          const p = document.getElementById('principal') || document.getElementById('loanAmount');
          const r = document.getElementById('interestRate') || document.getElementById('rate');
          const t = document.getElementById('tenure') || document.getElementById('loanTenure');
          if (p) p.value = '500000';
          if (r) r.value = '10';
          if (t) t.value = '5';
          const form = document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          } else {
            const btn = document.querySelector('button[type="submit"]') || document.querySelector('.btn-primary');
            if (btn) btn.click();
          }
        })()
      `,
      waitBeforeShot: 800
    });

    // 5. AI Financial Assistant
    await capturePage({
      url: 'http://localhost:5000/ai-assistant',
      viewport: { width: 1920, height: 1080 },
      filename: '13_ai_assistant_interface.png'
    });

    // 6. Dashboard
    await capturePage({
      url: 'http://localhost:5000/dashboard',
      viewport: { width: 1920, height: 1080 },
      filename: '14_dashboard_overview.png'
    });

    // 7. Application History
    await capturePage({
      url: 'http://localhost:5000/history',
      viewport: { width: 1920, height: 1080 },
      filename: '15_applications_history.png'
    });

    console.log('\n--- Evidence Capture Completed Successfully! ---');
  } catch (err) {
    console.error('Evidence capture failed:', err);
  } finally {
    chromeProcess.kill();
  }
}

run();
