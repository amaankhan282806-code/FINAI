/**
 * FINAI — Module 3: Credit Score Analyzer Controller
 */

let factorChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  setupCreditSliders();
  runAnalysis();

  const form = document.getElementById('credit-analyzer-form');
  if (form) {
    form.addEventListener('input', () => {
      runAnalysis();
    });
  }
});

function setupCreditSliders() {
  function sync(sliderId, inputId) {
    const s = document.getElementById(sliderId);
    const i = document.getElementById(inputId);
    if (!s || !i) return;

    s.addEventListener('input', () => {
      i.value = s.value;
      runAnalysis();
    });
    i.addEventListener('input', () => {
      s.value = i.value;
      runAnalysis();
    });
  }

  sync('creditScoreRange', 'creditScore');
  sync('utilizationRange', 'creditUtilization');
  sync('historyRange', 'creditHistoryLength');
  sync('loansRange', 'activeLoans');
  sync('inquiriesRange', 'recentInquiries');
}

async function runAnalysis() {
  const data = {
    creditScore: Number(document.getElementById('creditScore').value) || 750,
    paymentHistory: document.getElementById('paymentHistory').value || 'good',
    creditUtilization: Number(document.getElementById('creditUtilization').value) || 25,
    creditHistoryLength: Number(document.getElementById('creditHistoryLength').value) || 4,
    activeLoans: Number(document.getElementById('activeLoans').value) || 2,
    recentInquiries: Number(document.getElementById('recentInquiries').value) || 1
  };

  try {
    const res = await apiRequest(CONFIG.ENDPOINTS.CREDIT_ANALYZE, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    renderCreditAnalysis(res.data);
  } catch (err) {
    console.error('Credit analysis error:', err);
  }
}

function renderCreditAnalysis(analysis) {
  // Score Number
  const scoreEl = document.getElementById('score-display-number');
  if (scoreEl) scoreEl.textContent = analysis.score;

  // Category Badge
  const catEl = document.getElementById('score-display-category');
  if (catEl) {
    catEl.textContent = analysis.category;
    catEl.className = `badge badge-${analysis.badgeColor || 'info'}`;
  }

  // Description
  const descEl = document.getElementById('score-display-desc');
  if (descEl) descEl.textContent = analysis.description;

  // Approval probability
  const probEl = document.getElementById('score-approval-prob');
  if (probEl) probEl.textContent = analysis.approvalProbability;

  // Meter Needle Rotation (300 = -90deg, 900 = +90deg)
  const scorePercent = (analysis.score - 300) / 600;
  const rotationDeg = -90 + (scorePercent * 180);
  const needleEl = document.getElementById('gauge-needle');
  if (needleEl) {
    needleEl.style.transform = `rotate(${rotationDeg}deg)`;
  }

  // Render Factor Breakdown Cards
  const factorsContainer = document.getElementById('credit-factors-list');
  if (factorsContainer) {
    factorsContainer.innerHTML = analysis.factors.map(f => {
      let statusColor = 'var(--color-success)';
      if (f.score < 60) statusColor = 'var(--color-danger)';
      else if (f.score < 80) statusColor = 'var(--color-warning)';

      return `
        <div style="background:#FFFFFF;border:1px solid var(--navy-200);border-radius:var(--radius-lg);padding:1.25rem;margin-bottom:1rem;box-shadow:var(--glass-shadow);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
            <div>
              <span class="font-bold text-md">${f.name}</span>
              <span class="text-xs text-muted" style="margin-left:0.5rem;">Impact: ${f.weight}</span>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              ${f.actual ? `<span class="badge badge-neutral">${f.actual}</span>` : ''}
              <span class="badge" style="background:${statusColor}15;color:${statusColor};border:1px solid ${statusColor}30;">
                ${f.status}
              </span>
            </div>
          </div>

          <!-- Progress Bar -->
          <div style="width:100%;height:6px;background:var(--navy-100);border-radius:var(--radius-full);overflow:hidden;margin-bottom:0.75rem;">
            <div style="width:${f.score}%;height:100%;background:${statusColor};border-radius:var(--radius-full);transition:width 0.4s ease;"></div>
          </div>

          <p class="text-xs" style="color:var(--navy-600);line-height:1.5;">
            <i data-lucide="lightbulb" style="width:13px;height:13px;color:var(--color-warning);display:inline;vertical-align:text-bottom;"></i>
            ${f.recommendation}
          </p>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  // Render Factor Radar / Bar Chart
  renderFactorChart(analysis.factors);
}

function renderFactorChart(factors) {
  const ctx = document.getElementById('creditFactorRadar');
  if (!ctx) return;

  const labels = factors.map(f => f.name);
  const scores = factors.map(f => f.score);

  if (factorChartInstance) {
    factorChartInstance.data.datasets[0].data = scores;
    factorChartInstance.update();
    return;
  }

  factorChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Health Rating (0 - 100)',
        data: scores,
        backgroundColor: 'rgba(99, 91, 255, 0.2)',
        borderColor: '#635BFF',
        pointBackgroundColor: '#22D3EE',
        pointBorderColor: '#FFFFFF',
        pointHoverBackgroundColor: '#FFFFFF',
        pointHoverBorderColor: '#635BFF',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 25, font: { size: 10 } },
          pointLabels: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 600 },
            color: '#344054'
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}
