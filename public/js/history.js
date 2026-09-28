/**
 * FINAI — Module 6: Application History Controller
 */

let allHistoryApplications = [];

document.addEventListener('DOMContentLoaded', () => {
  loadHistoryRecords();

  const searchInput = document.getElementById('history-search');
  const filterSelect = document.getElementById('history-filter-status');
  const exportBtn = document.getElementById('btn-export-history');

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', applyFilters);
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportHistoryCSV);
  }
});

async function loadHistoryRecords() {
  const tbody = document.getElementById('history-table-body');
  try {
    const res = await apiRequest(CONFIG.ENDPOINTS.APPLICATIONS);
    allHistoryApplications = res.data || [];
    renderHistoryTable(allHistoryApplications);
  } catch (err) {
    console.error('History load error:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:2rem;color:var(--color-danger);">
            Failed to load application history: ${err.message}
          </td>
        </tr>
      `;
    }
  }
}

function applyFilters() {
  const searchTerm = (document.getElementById('history-search')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('history-filter-status')?.value || 'ALL';

  const filtered = allHistoryApplications.filter(app => {
    const matchesSearch = (app.fullName || '').toLowerCase().includes(searchTerm) ||
                          (app.id || '').toLowerCase().includes(searchTerm);
    
    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      matchesStatus = app.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  renderHistoryTable(filtered);
}

function renderHistoryTable(records) {
  const tbody = document.getElementById('history-table-body');
  const countEl = document.getElementById('history-count');
  if (!tbody) return;

  if (countEl) {
    countEl.textContent = `${records.length} records found`;
  }

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:3rem;color:var(--navy-400);">
          <i data-lucide="inbox" style="width:36px;height:36px;display:block;margin:0 auto 0.5rem;opacity:0.5;"></i>
          No application records match your filter criteria.
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  tbody.innerHTML = records.map(app => {
    let badgeClass = 'badge-success';
    if (app.status === 'NEEDS_IMPROVEMENT' || app.status === 'INELIGIBLE') badgeClass = 'badge-danger';
    if (app.status === 'CONDITIONAL') badgeClass = 'badge-warning';

    return `
      <tr>
        <td class="font-mono font-semibold" style="color:var(--secondary-indigo);">${app.id}</td>
        <td>
          <div class="font-semibold">${app.fullName}</div>
          <div class="text-xs text-muted">Age ${app.age || 28} • ${app.employmentType || 'Salaried'}</div>
        </td>
        <td class="text-muted">${formatDate(app.createdAt)}</td>
        <td class="font-semibold">${formatINR(app.requestedLoanAmount)}</td>
        <td class="font-semibold" style="color:var(--color-success);">${formatINR(app.indicativeEligibleAmount)}</td>
        <td>
          <span class="badge ${badgeClass}">${app.statusLabel || app.status}</span>
        </td>
        <td style="text-align:right;">
          <div style="display:inline-flex;gap:0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="viewHistoryDetail('${app.id}')">
              <i data-lucide="eye" style="width:14px;height:14px;"></i> Details
            </button>
            <button class="btn btn-secondary btn-sm" style="color:var(--color-danger);" onclick="deleteHistoryRecord('${app.id}')" title="Delete record">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function viewHistoryDetail(id) {
  const app = allHistoryApplications.find(a => a.id === id);
  if (!app) return;

  const modalEl = document.getElementById('historyDetailModal');
  const modalContent = document.getElementById('historyDetailModalContent');
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
        <h3 style="font-size:1.35rem;color:var(--primary-navy);">${app.fullName}</h3>
        <p class="text-sm text-muted">ID: ${app.id} • Registered: ${formatDate(app.createdAt)}</p>
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
      <h4 style="font-size:1rem;margin:1.25rem 0 0.5rem;">AI Advisor Recommendations</h4>
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

async function deleteHistoryRecord(id) {
  if (!confirm(`Are you sure you want to delete application ${id}?`)) return;

  try {
    await apiRequest(`${CONFIG.ENDPOINTS.APPLICATIONS}/${id}`, {
      method: 'DELETE'
    });
    showToast(`Application ${id} deleted successfully.`, 'info');
    allHistoryApplications = allHistoryApplications.filter(a => a.id !== id);
    applyFilters();
  } catch (err) {
    showToast('Failed to delete application: ' + err.message, 'error');
  }
}

function exportHistoryCSV() {
  if (allHistoryApplications.length === 0) {
    showToast('No records available to export.', 'warning');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Reference ID,Applicant Name,Age,Employment,Monthly Salary (INR),Credit Score,Existing EMI (INR),Requested Amount (INR),Indicative Limit (INR),Status,Created At\n';

  allHistoryApplications.forEach(a => {
    csvContent += `"${a.id}","${a.fullName}",${a.age},"${a.employmentType}",${a.monthlySalary},${a.creditScore},${a.existingEmi},${a.requestedLoanAmount},${a.indicativeEligibleAmount},"${a.status}","${a.createdAt}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `FINAI_Applications_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Applications history exported as CSV successfully!', 'success');
}
