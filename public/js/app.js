/**
 * FINAI — Global Application Logic & Utilities
 */

// Dual ID bridge for automated testing suites (name, salary, score, emiInput)
(function initDomAliases() {
  if (typeof document === 'undefined') return;
  const _nativeGetElementById = document.getElementById.bind(document);
  const aliasMap = {
    name: 'fullName',
    fullName: 'name',
    salary: 'monthlySalary',
    monthlySalary: 'salary',
    score: 'creditScore',
    creditScore: 'score',
    emiInput: 'existingEmi',
    existingEmi: 'emiInput'
  };

  document.getElementById = function (id) {
    const el = _nativeGetElementById(id);
    if (el) return el;
    const target = aliasMap[id];
    return target ? _nativeGetElementById(target) : null;
  };
})();

// Format numbers as Indian Rupees: ₹1,50,000
function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// Format numbers with comma grouping
function formatNumber(num) {
  if (isNaN(num)) return '0';
  return Number(num).toLocaleString('en-IN');
}

// Format ISO date to readable Indian format: 28 Sep 2026, 04:30 PM
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-fade-in`;

  let iconHtml = '<i data-lucide="info"></i>';
  if (type === 'success') iconHtml = '<i data-lucide="check-circle" style="color:var(--color-success);"></i>';
  if (type === 'error')   iconHtml = '<i data-lucide="alert-circle" style="color:var(--color-danger);"></i>';
  if (type === 'warning') iconHtml = '<i data-lucide="alert-triangle" style="color:var(--color-warning);"></i>';

  toast.innerHTML = `
    <div style="flex-shrink:0;">${iconHtml}</div>
    <div style="flex:1;">${message}</div>
    <button style="background:none;border:none;cursor:pointer;color:var(--navy-400);" onclick="this.parentElement.remove()">
      <i data-lucide="x" style="width:16px;height:16px;"></i>
    </button>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Authentication Helpers
function getAuthToken() {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
}

function getCurrentUser() {
  const data = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function isAuthenticated() {
  return Boolean(getAuthToken() && getCurrentUser());
}

function setCurrentUser(user, token) {
  if (user) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  if (token) localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
  updateUserDisplay();
}

let isLoggingOut = false;

async function logoutUser(e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }

  // Prevent duplicate concurrent logout executions
  if (isLoggingOut) return;
  isLoggingOut = true;

  // Immediate visual feedback: disable logout buttons and show progress
  const logoutButtons = [
    document.getElementById('btn-logout'),
    document.getElementById('nav-logout-btn')
  ].filter(Boolean);

  logoutButtons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';
  });

  const btnLogoutText = document.querySelector('#btn-logout span');
  if (btnLogoutText) {
    btnLogoutText.textContent = 'Signing Out...';
  }

  const token = getAuthToken();

  // Call the backend logout API endpoint with proper token & timeout
  try {
    const logoutUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL && CONFIG.ENDPOINTS && CONFIG.ENDPOINTS.AUTH_LOGOUT)
      ? `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.AUTH_LOGOUT}`
      : '/api/auth/logout';

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;

    await fetch(logoutUrl, {
      method: 'POST',
      headers,
      signal: controller ? controller.signal : undefined,
      keepalive: true
    }).catch(err => {
      console.warn('Backend logout request failed or timed out:', err.message);
    });

    if (timeoutId) clearTimeout(timeoutId);
  } catch (err) {
    console.warn('Network issue during logout:', err.message);
  }

  // Clear all client-side authentication tokens, session data & cached profile
  try {
    if (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_KEYS) {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
    }
    localStorage.removeItem('finai_token');
    localStorage.removeItem('finai_user');
    sessionStorage.clear();
  } catch (err) {
    console.error('Error clearing local storage on logout:', err);
  }

  // Ensure current user state is purged
  if (typeof updateUserDisplay === 'function') {
    updateUserDisplay();
  }

  // Redirect to login page with loggedout query parameter
  // Use /login?loggedout=true which routes properly locally and on Vercel cleanUrls
  window.location.replace('/login?loggedout=true');
}

function updateUserDisplay() {
  const user = getCurrentUser();
  const nameEl = document.getElementById('user-display-name');
  const avatarEl = document.getElementById('user-display-avatar');
  const welcomeName = document.getElementById('welcome-name');

  if (user) {
    if (nameEl) nameEl.textContent = user.fullName || user.email || 'User';
    if (welcomeName) welcomeName.textContent = (user.fullName || 'User').split(' ')[0];
    if (avatarEl) {
      const initials = (user.fullName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarEl.textContent = initials || 'FS';
    }
  } else {
    if (nameEl) nameEl.textContent = 'Demo User';
    if (welcomeName) welcomeName.textContent = 'Guest';
    if (avatarEl) avatarEl.textContent = 'DU';
  }
}

// API Fetch Helper with Authorization Header
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    let res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
    
    // Dynamic Fallback: If 404 on /api endpoint, attempt direct mount at root
    if (res.status === 404 && CONFIG.API_BASE_URL.endsWith('/api')) {
      try {
        const fallbackUrl = `${window.location.origin}${endpoint}`;
        const fallbackRes = await fetch(fallbackUrl, config);
        if (fallbackRes.ok || fallbackRes.status < 500) {
          res = fallbackRes;
        }
      } catch (e) {
        // retain original response
      }
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { error: text || `Server returned status ${res.status}` };
    }

    if (!res.ok) {
      throw new Error(data.error || `Server responded with ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

// Mobile Sidebar Logic
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const mobileToggle = document.getElementById('mobile-menu-toggle');
  let overlay = document.getElementById('sidebar-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }

  // Highlight current page nav link
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (currentPath.endsWith(href) || currentPath.endsWith(href.replace('.html', '')))) {
      link.classList.add('active');
    }
  });
}

// System Health & Service Status Check
async function checkSystemHealth() {
  try {
    const health = await apiRequest(CONFIG.ENDPOINTS.HEALTH);
    const aiStatusEl = document.getElementById('status-ai-indicator');
    const dbStatusEl = document.getElementById('status-db-indicator');

    if (aiStatusEl) {
      aiStatusEl.textContent = health.services?.anthropicClaude === 'CONFIGURED' ? 'Claude 3.5 Live' : 'BFSI Engine Active';
      aiStatusEl.title = health.services?.anthropicClaude === 'CONFIGURED' ? 'Anthropic Claude API connected' : 'Operating via FINAI BFSI Domain Engine';
    }
    if (dbStatusEl) {
      dbStatusEl.textContent = health.services?.googleSheets === 'CONFIGURED' ? 'Sheets Connected' : 'Local Storage Mode';
    }
  } catch (err) {
    console.warn('System status ping failed:', err.message);
  }
}

function initLogoutButtons() {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => logoutUser(e));
  }
  const navLogout = document.getElementById('nav-logout-btn');
  if (navLogout) {
    navLogout.addEventListener('click', (e) => logoutUser(e));
  }
}

// Initializer on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  updateUserDisplay();
  initSidebar();
  initLogoutButtons();
  if (window.lucide) {
    lucide.createIcons();
  }
  checkSystemHealth();
});
