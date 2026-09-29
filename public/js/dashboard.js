/**
 * FINAI Dashboard Controller
 */

let applicationsData = [];
let statusChartInstance = null;

async function loadDashboardData() {
  try {
    const res = await apiRequest(CONFIG.ENDPOINTS.APPLICATIONS);
    applicationsData = res.data || [];
    renderDashboardStats();
    renderRecentTable();
    renderStatusChart();
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    showToast('Could not fetch latest applications: ' + err.message, 'error');
  }
}

function renderDashboardStats() {
  if (applicationsData.length === 0) return;

  const latest = applicationsData[0];

  // Latest Indicative Amount
  const indicativeEl = document.getElementById('stat-indicative-amount');
  if (indicativeEl) {
    indicativeEl.textContent = formatINR(latest.indicativeEligibleAmount || 0);
  }

  // Latest Status Badge
  const statusEl = document.getElementById('stat-latest-status');
  if (statusEl) {
    statusEl.textContent = latest.statusLabel || latest.status;
    statusEl.className = `badge badge-${latest.badgeColor || 'indigo'}`;
  }

  // Credit Score Average
  const creditEl = document.getElementById('stat-avg-credit');
  if (creditEl) {
    const validScores = applicationsData.filter(a => a.creditScore).map(a => a.creditScore);
    const avgScore = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 750;
    creditEl.textContent = avgScore;
  }

  // Total Applications Count
  const countEl = document.getElementById('stat-total-checks');
  if (countEl) {
    countEl.textContent = applicationsData.length;
  }

  // Latest Health Score
  const healthEl = document.getElementById('stat-health-score');
  if (healthEl) {
    healthEl.textContent = `${latest.healthScore || 85}/100`;
  }
}

function renderRecentTable() {
  const tbody = document.getElementById('recent-applications-body');
  if (!tbody) return;

  if (applicationsData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:2rem;color:var(--navy-400);">
          No eligibility checks recorded yet. Click "Check Loan Eligibility" to start.
        </td>
      </tr>
    `;
    return;
  }

  const recent = applicationsData.slice(0, 5);
  tbody.innerHTML = recent.map(app => {
    let badgeClass = 'badge-success';
    if (app.status === 'NEEDS_IMPROVEMENT' || app.status === 'INELIGIBLE') badgeClass = 'badge-danger';
    if (app.status === 'CONDITIONAL') badgeClass = 'badge-warning';

    return `
      <tr>
        <td class="font-mono font-semibold" style="color:var(--secondary-indigo);">${app.id}</td>
        <td>
          <div class="font-semibold">${app.fullName}</div>
          <div class="text-xs text-muted">${app.employmentType || 'Salaried'} • Age ${app.age || 28}</div>
        </td>
        <td class="font-semibold">${formatINR(app.requestedLoanAmount)}</td>
        <td class="font-semibold" style="color:var(--color-success);">${formatINR(app.indicativeEligibleAmount)}</td>
        <td>
          <span class="badge ${badgeClass}">${app.statusLabel || app.status}</span>
        </td>
        <td class="text-muted text-xs">${formatDate(app.createdAt)}</td>
        <td style="text-align:right;">
          <button class="btn btn-secondary btn-sm" onclick="viewApplicationDetail('${app.id}')">
            <i data-lucide="eye" style="width:14px;height:14px;"></i> Details
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function renderStatusChart() {
  const ctx = document.getElementById('dashboardStatusChart');
  if (!ctx) return;

  const eligibleCount = applicationsData.filter(a => a.status === 'ELIGIBLE').length;
  const conditionalCount = applicationsData.filter(a => a.status === 'CONDITIONAL').length;
  const ineligibleCount = applicationsData.filter(a => a.status === 'NEEDS_IMPROVEMENT' || a.status === 'INELIGIBLE').length;

  if (statusChartInstance) {
    statusChartInstance.destroy();
  }

  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Highly Eligible', 'Conditional', 'Requires Improvement'],
      datasets: [{
        data: [eligibleCount || 1, conditionalCount, ineligibleCount],
        backgroundColor: ['#16A34A', '#F59E0B', '#EF4444'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 15,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
          }
        }
      },
      cutout: '72%'
    }
  });
}

function viewApplicationDetail(id) {
  const app = applicationsData.find(a => a.id === id);
  if (!app) return;

  const modalEl = document.getElementById('detailModal');
  const modalContent = document.getElementById('detailModalContent');
  if (!modalEl || !modalContent) return;

  let checksHtml = (app.checks || []).map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;background:var(--navy-50);border-radius:var(--radius-sm);margin-bottom:0.5rem;">
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <span style="color:${c.passed ? 'var(--color-success)' : 'var(--color-danger)'};font-weight:700;">
          ${c.passed ? '✓' : '✗'}
        </span>
        <span style="font-size:0.9rem;font-weight:600;">${c.label}</span>
      </div>
      <span class="badge ${c.passed ? 'badge-success' : 'badge-danger'}">
        ${c.passed ? 'PASSED' : 'ACTION REQUIRED'}
      </span>
    </div>
  `).join('');

  let suggestionsHtml = (app.suggestions || []).map(s => `
    <li style="margin-bottom:0.4rem;font-size:0.88rem;color:var(--navy-700);">${s}</li>
  `).join('');

  modalContent.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
      <div>
        <h3 style="font-size:1.3rem;">${app.fullName}</h3>
        <p class="text-sm text-muted">Reference: ${app.id} • ${formatDate(app.createdAt)}</p>
      </div>
      <div class="badge badge-${app.badgeColor || 'indigo'}" style="font-size:0.85rem;padding:0.45rem 1rem;">
        ${app.statusLabel || app.status}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:1rem;margin-bottom:1.5rem;">
      <div style="background:var(--navy-50);padding:1rem;border-radius:var(--radius-md);">
        <div class="text-xs text-muted">Monthly Salary</div>
        <div class="text-lg font-bold">${formatINR(app.monthlySalary)}</div>
      </div>
      <div style="background:var(--navy-50);padding:1rem;border-radius:var(--radius-md);">
        <div class="text-xs text-muted">Credit Score</div>
        <div class="text-lg font-bold" style="color:var(--secondary-indigo);">${app.creditScore}</div>
      </div>
      <div style="background:var(--navy-50);padding:1rem;border-radius:var(--radius-md);">
        <div class="text-xs text-muted">Existing Monthly EMIs</div>
        <div class="text-lg font-bold">${formatINR(app.existingEmi)}</div>
      </div>
      <div style="background:var(--navy-50);padding:1rem;border-radius:var(--radius-md);">
        <div class="text-xs text-muted">Indicative Eligible Limit</div>
        <div class="text-lg font-bold" style="color:var(--color-success);">${formatINR(app.indicativeEligibleAmount)}</div>
      </div>
    </div>

    <h4 style="font-size:1rem;margin-bottom:0.75rem;">Criteria Evaluation Breakdown</h4>
    ${checksHtml || '<p class="text-muted text-sm">No criteria breakdown recorded.</p>'}

    ${suggestionsHtml ? `
      <h4 style="font-size:1rem;margin:1.25rem 0 0.5rem;">AI Financial Recommendations</h4>
      <ul style="padding-left:1.25rem;">${suggestionsHtml}</ul>
    ` : ''}

    <div style="margin-top:1.5rem;display:flex;gap:0.75rem;justify-content:flex-end;">
      <a href="emi-calculator.html?amount=${app.indicativeEligibleAmount || 500000}" class="btn btn-outline btn-sm">
        <i data-lucide="calculator" style="width:14px;height:14px;"></i> Open in EMI Calculator
      </a>
      <a href="ai-assistant.html?contextId=${app.id}" class="btn btn-primary btn-sm">
        <i data-lucide="bot" style="width:14px;height:14px;"></i> Ask AI Assistant
      </a>
    </div>
  `;

  modalEl.classList.add('active');
  if (window.lucide) lucide.createIcons();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Client-side authentication guard
if (typeof window !== 'undefined' && typeof isAuthenticated === 'function' && !isAuthenticated()) {
  window.location.replace('login.html');
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
    window.location.replace('login.html');
    return;
  }
  if (typeof updateUserDisplay === 'function') {
    updateUserDisplay();
  }
  loadDashboardData();
});
