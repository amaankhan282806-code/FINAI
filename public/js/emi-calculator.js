/**
 * FINAI — Module 2: Interactive EMI Calculator Controller
 */

let emiChartInstance = null;
let currentCalculation = null;
let activeScheduleView = 'yearly'; // 'yearly' or 'monthly'
let currentMonthlyPage = 1;
const ITEMS_PER_PAGE = 12;

document.addEventListener('DOMContentLoaded', () => {
  // Read URL params (e.g. ?amount=1000000&rate=10.5&tenure=60)
  parseUrlParams();

  // Bind inputs and sliders
  setupEmiBindings();

  // Initial calculation
  calculateLiveEMI();
});

function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const amount = params.get('amount');
  const rate = params.get('rate');
  const tenure = params.get('tenure');

  if (amount && document.getElementById('loanAmount')) {
    document.getElementById('loanAmount').value = amount;
    if (document.getElementById('loanAmountRange')) document.getElementById('loanAmountRange').value = amount;
  }
  if (rate && document.getElementById('interestRate')) {
    document.getElementById('interestRate').value = rate;
    if (document.getElementById('interestRateRange')) document.getElementById('interestRateRange').value = rate;
  }
  if (tenure && document.getElementById('loanTenure')) {
    document.getElementById('loanTenure').value = tenure;
    if (document.getElementById('loanTenureRange')) document.getElementById('loanTenureRange').value = tenure;
  }
}

function setupEmiBindings() {
  const loanInput = document.getElementById('loanAmount');
  const loanSlider = document.getElementById('loanAmountRange');
  const rateInput = document.getElementById('interestRate');
  const rateSlider = document.getElementById('interestRateRange');
  const tenureInput = document.getElementById('loanTenure');
  const tenureSlider = document.getElementById('loanTenureRange');
  const tenureTypeSelect = document.getElementById('tenureType');

  // Pair slider & inputs
  function bindPair(input, slider) {
    if (!input || !slider) return;
    slider.addEventListener('input', () => {
      input.value = slider.value;
      calculateLiveEMI();
    });
    input.addEventListener('input', () => {
      slider.value = input.value;
      calculateLiveEMI();
    });
  }

  bindPair(loanInput, loanSlider);
  bindPair(rateInput, rateSlider);
  bindPair(tenureInput, tenureSlider);

  if (tenureTypeSelect) {
    tenureTypeSelect.addEventListener('change', () => {
      const isYears = tenureTypeSelect.value === 'years';
      if (isYears) {
        tenureSlider.min = 1;
        tenureSlider.max = 30;
        tenureSlider.step = 1;
        tenureInput.value = Math.max(1, Math.round(tenureInput.value / 12));
        tenureSlider.value = tenureInput.value;
      } else {
        tenureSlider.min = 6;
        tenureSlider.max = 360;
        tenureSlider.step = 6;
        tenureInput.value = tenureInput.value * 12;
        tenureSlider.value = tenureInput.value;
      }
      calculateLiveEMI();
    });
  }

  // Schedule view tab switchers
  const btnYearly = document.getElementById('btn-view-yearly');
  const btnMonthly = document.getElementById('btn-view-monthly');

  if (btnYearly) {
    btnYearly.addEventListener('click', () => {
      activeScheduleView = 'yearly';
      btnYearly.classList.add('active', 'btn-primary');
      btnYearly.classList.remove('btn-secondary');
      btnMonthly.classList.remove('active', 'btn-primary');
      btnMonthly.classList.add('btn-secondary');
      renderScheduleTable();
    });
  }

  if (btnMonthly) {
    btnMonthly.addEventListener('click', () => {
      activeScheduleView = 'monthly';
      btnMonthly.classList.add('active', 'btn-primary');
      btnMonthly.classList.remove('btn-secondary');
      btnYearly.classList.remove('active', 'btn-primary');
      btnYearly.classList.add('btn-secondary');
      currentMonthlyPage = 1;
      renderScheduleTable();
    });
  }

  // Export CSV
  const btnExport = document.getElementById('btn-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', exportAmortizationCSV);
  }
}

// Live calculation via mathematical formula
function calculateLiveEMI() {
  const p = Number(document.getElementById('loanAmount').value) || 0;
  const rAnnual = Number(document.getElementById('interestRate').value) || 0;
  let tenureVal = Number(document.getElementById('loanTenure').value) || 0;
  const isYears = document.getElementById('tenureType')?.value === 'years';

  const tenureMonths = isYears ? tenureVal * 12 : tenureVal;

  if (p <= 0 || tenureMonths <= 0) return;

  const monthlyRate = (rAnnual / 12) / 100;
  let monthlyEmi = 0;

  if (monthlyRate === 0) {
    monthlyEmi = p / tenureMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    monthlyEmi = (p * monthlyRate * factor) / (factor - 1);
  }

  const roundedEmi = Math.round(monthlyEmi);
  const totalRepayment = Math.round(roundedEmi * tenureMonths);
  const totalInterest = Math.max(0, totalRepayment - p);

  const principalRatio = Number(((p / totalRepayment) * 100).toFixed(1));
  const interestRatio = Number(((totalInterest / totalRepayment) * 100).toFixed(1));

  // Generate schedules
  let currentBalance = p;
  const monthlySchedule = [];
  const yearlyMap = {};

  for (let m = 1; m <= tenureMonths; m++) {
    const interestPaid = Math.round(currentBalance * monthlyRate);
    let principalPaid = 0;

    if (m === tenureMonths) {
      principalPaid = currentBalance;
      currentBalance = 0;
    } else {
      principalPaid = Math.min(currentBalance, roundedEmi - interestPaid);
      currentBalance = Math.max(0, currentBalance - principalPaid);
    }

    const yr = Math.ceil(m / 12);
    if (!yearlyMap[yr]) {
      yearlyMap[yr] = { year: yr, principalPaid: 0, interestPaid: 0, totalPaid: 0, endingBalance: currentBalance };
    }
    yearlyMap[yr].principalPaid += principalPaid;
    yearlyMap[yr].interestPaid += interestPaid;
    yearlyMap[yr].totalPaid += (principalPaid + interestPaid);
    yearlyMap[yr].endingBalance = currentBalance;

    monthlySchedule.push({
      month: m,
      year: yr,
      emi: roundedEmi,
      principalPaid,
      interestPaid,
      remainingBalance: currentBalance
    });
  }

  currentCalculation = {
    principal: p,
    interestRate: rAnnual,
    tenureMonths,
    monthlyEmi: roundedEmi,
    totalInterest,
    totalRepayment,
    principalRatio,
    interestRatio,
    yearlySchedule: Object.values(yearlyMap),
    monthlySchedule
  };

  // Update UI Text Elements
  document.getElementById('out-monthly-emi').textContent = formatINR(roundedEmi);
  document.getElementById('out-total-interest').textContent = formatINR(totalInterest);
  document.getElementById('out-total-repayment').textContent = formatINR(totalRepayment);
  document.getElementById('out-principal-amount').textContent = formatINR(p);

  document.getElementById('ratio-principal-text').textContent = `${principalRatio}%`;
  document.getElementById('ratio-interest-text').textContent = `${interestRatio}%`;

  // Update Chart
  updateEmiChart(p, totalInterest);

  // Render Amortization Table
  renderScheduleTable();
}

function updateEmiChart(principal, interest) {
  const ctx = document.getElementById('emiDonutChart');
  if (!ctx) return;

  if (emiChartInstance) {
    emiChartInstance.data.datasets[0].data = [principal, interest];
    emiChartInstance.update();
    return;
  }

  emiChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Principal Loan Amount', 'Total Interest Payable'],
      datasets: [{
        data: [principal, interest],
        backgroundColor: ['#635BFF', '#22D3EE'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              return ` ${context.label}: ${formatINR(val)}`;
            }
          }
        }
      },
      cutout: '74%'
    }
  });
}

function renderScheduleTable() {
  const tbody = document.getElementById('amortization-table-body');
  const thead = document.getElementById('amortization-table-head');
  const paginationControls = document.getElementById('amortization-pagination');
  if (!tbody || !currentCalculation) return;

  if (activeScheduleView === 'yearly') {
    if (paginationControls) paginationControls.style.display = 'none';

    thead.innerHTML = `
      <tr>
        <th>Year</th>
        <th>Principal Paid (₹)</th>
        <th>Interest Paid (₹)</th>
        <th>Total Payment (₹)</th>
        <th>Ending Balance (₹)</th>
      </tr>
    `;

    tbody.innerHTML = currentCalculation.yearlySchedule.map(y => `
      <tr>
        <td class="font-bold">Year ${y.year}</td>
        <td style="color:var(--secondary-indigo);font-weight:600;">${formatINR(y.principalPaid)}</td>
        <td style="color:var(--accent-cyan);font-weight:600;">${formatINR(y.interestPaid)}</td>
        <td class="font-semibold">${formatINR(y.totalPaid)}</td>
        <td class="font-mono text-muted">${formatINR(y.endingBalance)}</td>
      </tr>
    `).join('');
  } else {
    // Monthly view with pagination
    if (paginationControls) paginationControls.style.display = 'flex';

    thead.innerHTML = `
      <tr>
        <th>Month</th>
        <th>Year</th>
        <th>Monthly EMI (₹)</th>
        <th>Principal (₹)</th>
        <th>Interest (₹)</th>
        <th>Remaining Balance (₹)</th>
      </tr>
    `;

    const totalPages = Math.ceil(currentCalculation.monthlySchedule.length / ITEMS_PER_PAGE);
    const startIdx = (currentMonthlyPage - 1) * ITEMS_PER_PAGE;
    const pageItems = currentCalculation.monthlySchedule.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    tbody.innerHTML = pageItems.map(m => `
      <tr>
        <td class="font-mono font-semibold">#${m.month}</td>
        <td>Year ${m.year}</td>
        <td class="font-bold">${formatINR(m.emi)}</td>
        <td style="color:var(--secondary-indigo);">${formatINR(m.principalPaid)}</td>
        <td style="color:var(--accent-cyan);">${formatINR(m.interestPaid)}</td>
        <td class="font-mono text-muted">${formatINR(m.remainingBalance)}</td>
      </tr>
    `).join('');

    renderPaginationControls(totalPages);
  }
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById('amortization-pagination');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:1rem 0.5rem;">
      <div class="text-xs text-muted">
        Showing month ${(currentMonthlyPage - 1) * ITEMS_PER_PAGE + 1} to ${Math.min(currentMonthlyPage * ITEMS_PER_PAGE, currentCalculation.monthlySchedule.length)} of ${currentCalculation.monthlySchedule.length}
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <button class="btn btn-secondary btn-sm" ${currentMonthlyPage === 1 ? 'disabled' : ''} onclick="changeMonthlyPage(${currentMonthlyPage - 1})">
          Previous
        </button>
        <span class="text-xs font-semibold">Page ${currentMonthlyPage} of ${totalPages}</span>
        <button class="btn btn-secondary btn-sm" ${currentMonthlyPage === totalPages ? 'disabled' : ''} onclick="changeMonthlyPage(${currentMonthlyPage + 1})">
          Next
        </button>
      </div>
    </div>
  `;
}

function changeMonthlyPage(newPage) {
  currentMonthlyPage = newPage;
  renderScheduleTable();
}

function exportAmortizationCSV() {
  if (!currentCalculation || !currentCalculation.monthlySchedule) return;

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Month,Year,EMI (INR),Principal Paid (INR),Interest Paid (INR),Remaining Balance (INR)\n';

  currentCalculation.monthlySchedule.forEach(m => {
    csvContent += `${m.month},${m.year},${m.emi},${m.principalPaid},${m.interestPaid},${m.remainingBalance}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `FINAI_Amortization_Schedule_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Amortization schedule exported as CSV successfully!', 'success');
}
