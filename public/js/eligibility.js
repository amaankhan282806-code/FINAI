/**
 * FINAI — Module 1: Loan Eligibility Checker Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('eligibility-form');
  const resultsContainer = document.getElementById('eligibility-results');
  const submitBtn = document.getElementById('btn-check-eligibility');

  // Sliders synchronization
  setupSliderSync('salaryRange', 'monthlySalary');
  setupSliderSync('creditScoreRange', 'creditScore');
  setupSliderSync('existingEmiRange', 'existingEmi');
  setupSliderSync('loanAmountRange', 'desiredLoanAmount');
  setupSliderSync('tenureRange', 'loanTenureMonths');

  // Quick preset buttons (e.g. Salaried Pro, Young Professional, Senior Borrower)
  setupPresets();

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleFormSubmit();
    });
  }

  // Preload last check if available
  const savedCheck = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_ELIGIBILITY);
  if (savedCheck) {
    try {
      const parsed = JSON.parse(savedCheck);
      populateForm(parsed);
      renderResults(parsed);
    } catch (e) {
      console.warn('Could not parse cached eligibility check:', e);
    }
  }
});

function setupSliderSync(sliderId, inputId) {
  const slider = document.getElementById(sliderId);
  const input = document.getElementById(inputId);
  if (!slider || !input) return;

  slider.addEventListener('input', () => {
    input.value = slider.value;
  });

  input.addEventListener('input', () => {
    slider.value = input.value;
  });
}

function setupPresets() {
  const preset1 = document.getElementById('preset-salaried-prime');
  if (preset1) {
    preset1.addEventListener('click', () => {
      populateForm({
        fullName: 'Rahul Sharma',
        age: 29,
        employmentType: 'Salaried',
        monthlySalary: 85000,
        creditScore: 780,
        existingEmi: 10000,
        desiredLoanAmount: 1500000,
        loanTenureMonths: 60
      });
      showToast('Loaded Prime Salaried Profile preset.', 'info');
    });
  }

  const preset2 = document.getElementById('preset-starter');
  if (preset2) {
    preset2.addEventListener('click', () => {
      populateForm({
        fullName: 'Aarav Patel',
        age: 22,
        employmentType: 'Salaried',
        monthlySalary: 32000,
        creditScore: 710,
        existingEmi: 5000,
        desiredLoanAmount: 500000,
        loanTenureMonths: 36
      });
      showToast('Loaded Starter Professional preset.', 'info');
    });
  }

  const preset3 = document.getElementById('preset-needs-repair');
  if (preset3) {
    preset3.addEventListener('click', () => {
      populateForm({
        fullName: 'Vikas Verma',
        age: 27,
        employmentType: 'Self-Employed',
        monthlySalary: 26000,
        creditScore: 640,
        existingEmi: 18000,
        desiredLoanAmount: 700000,
        loanTenureMonths: 48
      });
      showToast('Loaded Profile Needing Improvement preset.', 'warning');
    });
  }
}

function populateForm(data) {
  const fields = ['fullName', 'age', 'employmentType', 'monthlySalary', 'creditScore', 'existingEmi', 'desiredLoanAmount', 'loanTenureMonths'];
  fields.forEach(field => {
    const el = document.getElementById(field);
    if (el && data[field] !== undefined) {
      el.value = data[field];
    }
    const slider = document.getElementById(field + 'Range');
    if (slider && data[field] !== undefined) {
      slider.value = data[field];
    }
  });
}

async function handleFormSubmit() {
  const submitBtn = document.getElementById('btn-check-eligibility');
  const originalBtnText = submitBtn.innerHTML;

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="typing-dot" style="display:inline-block;width:6px;height:6px;background:#FFF;border-radius:50%;margin-right:6px;"></span>
      Evaluating Criteria...
    `;

    const formData = {
      fullName: document.getElementById('fullName').value,
      age: Number(document.getElementById('age').value),
      employmentType: document.getElementById('employmentType').value,
      monthlySalary: Number(document.getElementById('monthlySalary').value),
      creditScore: Number(document.getElementById('creditScore').value),
      existingEmi: Number(document.getElementById('existingEmi').value),
      desiredLoanAmount: Number(document.getElementById('desiredLoanAmount').value),
      loanTenureMonths: Number(document.getElementById('loanTenureMonths').value)
    };

    const res = await apiRequest(CONFIG.ENDPOINTS.ELIGIBILITY_CHECK, {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    const result = res.data;
    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_ELIGIBILITY, JSON.stringify(result));

    renderResults(result);
    showToast('Eligibility assessment evaluated successfully!', 'success');

    // Smooth scroll to results
    const resultsContainer = document.getElementById('eligibility-results');
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    console.error('Eligibility check error:', err);
    showToast(err.message || 'Failed to process eligibility calculation.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
    if (window.lucide) lucide.createIcons();
  }
}

function renderResults(result) {
  const container = document.getElementById('eligibility-results');
  if (!container) return;

  container.style.display = 'block';

  let statusClass = 'status-eligible';
  let badgeType = 'badge-success';
  if (result.status === 'NEEDS_IMPROVEMENT' || result.status === 'INELIGIBLE') {
    statusClass = 'status-ineligible';
    badgeType = 'badge-danger';
  } else if (result.status === 'CONDITIONAL') {
    statusClass = 'status-conditional';
    badgeType = 'badge-warning';
  }

  // Criteria checks items
  const checksHtml = (result.checks || []).map(c => `
    <div class="criteria-item ${c.passed ? 'pass' : 'fail'} animate-fade-in">
      <div class="criteria-icon">
        <i data-lucide="${c.passed ? 'check' : 'x'}"></i>
      </div>
      <div style="flex:1;">
        <div class="criteria-title">${c.label}</div>
        <div class="criteria-desc">${c.message}</div>
      </div>
      <div class="badge ${c.passed ? 'badge-success' : 'badge-danger'}">
        ${c.passed ? 'PASSED' : 'NOT MET'}
      </div>
    </div>
  `).join('');

  // Suggestions items
  const suggestionsHtml = (result.suggestions || []).map(s => `
    <li style="margin-bottom:0.6rem;font-size:0.92rem;color:var(--navy-700);line-height:1.5;">
      ${s}
    </li>
  `).join('');

  container.innerHTML = `
    <div class="result-card ${statusClass} animate-fade-in">
      <div class="result-header">
        <div>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.4rem;">
            <span class="badge ${badgeType}">${result.statusLabel || result.status}</span>
            <span class="text-xs text-muted">Reference: ${result.id || 'FINAI-EVAL'}</span>
          </div>
          <h2 style="font-size:1.75rem;color:var(--primary-navy);">Evaluation for ${result.fullName}</h2>
          <p class="text-sm text-muted">Evaluated on ${formatDate(result.evaluatedAt || new Date().toISOString())}</p>
        </div>

        <div class="result-score-circle">
          <div class="result-score-number">${result.healthScore || 85}</div>
          <div class="result-score-label">Health Score</div>
        </div>
      </div>

      <!-- Financial Metrics Summary Cards -->
      <div class="stats-grid" style="margin-bottom:1.75rem;">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Indicative Eligible Limit</span>
            <div class="stat-icon green"><i data-lucide="shield-check"></i></div>
          </div>
          <div class="stat-value" style="color:var(--color-success);">${formatINR(result.indicativeEligibleAmount)}</div>
          <div class="text-xs text-muted" style="margin-top:0.35rem;">Formula: Monthly Salary × 20</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Requested Loan Amount</span>
            <div class="stat-icon indigo"><i data-lucide="landmark"></i></div>
          </div>
          <div class="stat-value">${formatINR(result.requestedLoanAmount)}</div>
          <div class="text-xs text-muted" style="margin-top:0.35rem;">Tenure: ${result.loanTenureMonths} Months (${(result.loanTenureMonths/12).toFixed(1)} Yrs)</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Monthly Salary</span>
            <div class="stat-icon cyan"><i data-lucide="wallet"></i></div>
          </div>
          <div class="stat-value">${formatINR(result.monthlySalary)}</div>
          <div class="text-xs text-muted" style="margin-top:0.35rem;">Min Required: ₹30,000</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Credit Score (CIBIL)</span>
            <div class="stat-icon amber"><i data-lucide="gauge"></i></div>
          </div>
          <div class="stat-value" style="color:${result.creditScore >= 700 ? 'var(--color-success)' : 'var(--color-warning)'};">${result.creditScore}</div>
          <div class="text-xs text-muted" style="margin-top:0.35rem;">Benchmark: > 700 points</div>
        </div>
      </div>

      <!-- Criteria Breakdown Section -->
      <div style="margin-bottom:2rem;">
        <h3 style="font-size:1.15rem;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
          <i data-lucide="check-square" style="color:var(--secondary-indigo);"></i>
          Eligibility Rules Breakdown
        </h3>
        <div class="criteria-list">
          ${checksHtml}
        </div>
      </div>

      <!-- Actionable Suggestions -->
      <div style="background:var(--navy-50);border:1px solid var(--navy-200);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:2rem;">
        <h3 style="font-size:1.1rem;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;color:var(--primary-navy);">
          <i data-lucide="sparkles" style="color:var(--accent-cyan);"></i>
          Personalized Recommendations to Enhance Approval Chances
        </h3>
        <ul style="padding-left:1.25rem;">
          ${suggestionsHtml}
        </ul>
      </div>

      <!-- Disclaimer & Next Actions -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;border-top:1px solid var(--navy-200);padding-top:1.5rem;">
        <p class="text-xs text-muted" style="max-width:550px;">
          <i data-lucide="info" style="width:14px;height:14px;display:inline-block;vertical-align:text-bottom;"></i>
          ${result.disclaimer || 'Indicative guidance only. Subject to official verification by lender.'}
        </p>

        <div style="display:flex;gap:0.75rem;">
          <a href="emi-calculator.html?amount=${result.indicativeEligibleAmount || result.requestedLoanAmount}&tenure=${result.loanTenureMonths}" class="btn btn-outline">
            <i data-lucide="calculator"></i> Calculate EMI
          </a>
          <a href="ai-assistant.html?context=loan_eligibility" class="btn btn-primary">
            <i data-lucide="bot"></i> Consult AI Advisor
          </a>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}
