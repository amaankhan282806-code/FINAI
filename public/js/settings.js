/**
 * FINAI — Settings & Integrations Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  loadProfileSettings();
  loadIntegrationStatuses();

  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProfileSettings();
    });
  }

  const btnTestSheets = document.getElementById('btn-test-sheets');
  if (btnTestSheets) {
    btnTestSheets.addEventListener('click', testGoogleSheets);
  }

  const btnResetDemo = document.getElementById('btn-reset-demo');
  if (btnResetDemo) {
    btnResetDemo.addEventListener('click', resetDemoData);
  }
});

function loadProfileSettings() {
  const user = getCurrentUser();
  if (!user) return;

  const nameInput = document.getElementById('settings-fullName');
  const emailInput = document.getElementById('settings-email');

  if (nameInput) nameInput.value = user.fullName || '';
  if (emailInput) emailInput.value = user.email || '';
}

function saveProfileSettings() {
  const fullName = document.getElementById('settings-fullName').value.trim();
  const email = document.getElementById('settings-email').value.trim();

  if (!fullName || !email) {
    showToast('Name and email cannot be empty.', 'error');
    return;
  }

  const currentUser = getCurrentUser() || {};
  currentUser.fullName = fullName;
  currentUser.email = email;

  localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(currentUser));
  updateUserDisplay();
  showToast('Profile information updated successfully.', 'success');
}

async function loadIntegrationStatuses() {
  // Claude AI Status
  try {
    const aiRes = await apiRequest(CONFIG.ENDPOINTS.AI_STATUS);
    const claudeStatusText = document.getElementById('claude-status-text');
    const claudeBadge = document.getElementById('claude-status-badge');
    if (claudeStatusText && claudeBadge) {
      if (aiRes.data?.isAiConfigured || aiRes.data?.isClaudeConfigured) {
        claudeStatusText.textContent = `Connected to live cloud AI: ${aiRes.data.model}`;
        claudeBadge.textContent = 'Active';
        claudeBadge.className = 'badge badge-success';
      } else {
        claudeStatusText.textContent = 'No external AI key found in .env. Running via FINAI local BFSI knowledge engine.';
        claudeBadge.textContent = 'Offline Engine';
        claudeBadge.className = 'badge badge-neutral';
      }
    }
  } catch (err) {
    console.warn('AI status fetch notice:', err);
  }

  // Google Sheets Status
  try {
    const sheetsRes = await apiRequest(CONFIG.ENDPOINTS.SHEETS_STATUS);
    const sheetsStatusText = document.getElementById('sheets-status-text');
    const sheetsBadge = document.getElementById('sheets-status-badge');
    if (sheetsStatusText && sheetsBadge) {
      if (sheetsRes.data?.isConfigured) {
        sheetsStatusText.textContent = `Configured via: ${sheetsRes.data.mode}`;
        sheetsBadge.textContent = 'Connected';
        sheetsBadge.className = 'badge badge-success';
      } else {
        sheetsStatusText.textContent = 'Running in Local Storage Mode. Google Sheets credentials not configured.';
        sheetsBadge.textContent = 'Local Mode';
        sheetsBadge.className = 'badge badge-neutral';
      }
    }
  } catch (err) {
    console.warn('Sheets status fetch notice:', err);
  }
}

async function testGoogleSheets() {
  const btn = document.getElementById('btn-test-sheets');
  const original = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = 'Testing Connectivity...';

    const res = await apiRequest(CONFIG.ENDPOINTS.SHEETS_TEST, {
      method: 'POST'
    });

    if (res.data?.connected) {
      showToast('Google Sheets connection successful!', 'success');
    } else {
      showToast(res.data?.message || 'Google Sheets is in Local Mode (no credentials provided in .env).', 'warning');
    }
  } catch (err) {
    showToast('Connectivity test result: ' + err.message, 'warning');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
    if (window.lucide) lucide.createIcons();
  }
}

function resetDemoData() {
  if (confirm('Reset demo session and restore default sample applicant records?')) {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_ELIGIBILITY);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CHAT_HISTORY);
    showToast('Demo state reset. Reloading...', 'info');
    setTimeout(() => window.location.reload(), 800);
  }
}
