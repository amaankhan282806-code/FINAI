/**
 * Live Server Endpoint Verification Script
 */

const BASE_URL = 'http://localhost:5000';

async function testEndpoint(name, url, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, options);
    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    
    if (res.ok) {
      console.log(`  ✓ [HTTP ${res.status}] ${name}`);
      return { success: true, status: res.status, body };
    } else {
      console.error(`  ✗ [HTTP ${res.status}] ${name}:`, body);
      return { success: false, status: res.status, body };
    }
  } catch (err) {
    console.error(`  ✗ [NETWORK ERROR] ${name}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function runLiveVerification() {
  console.log('\n=============================================');
  console.log('   FINAI LIVE API & ROUTE VERIFICATION      ');
  console.log('=============================================\n');

  // 1. Health
  await testEndpoint('Health Check', '/api/health');

  // 2. Eligibility API
  await testEndpoint('Eligibility Check API (Valid Candidate)', '/api/eligibility/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Vikram Malhotra',
      age: 31,
      monthlySalary: 80000,
      employmentType: 'Salaried',
      creditScore: 760,
      existingEmi: 15000,
      desiredLoanAmount: 1600000,
      loanTenureMonths: 60
    })
  });

  // 3. EMI Calculation API
  await testEndpoint('EMI Calculate API (10 Lakhs, 10.5%, 60 Mo)', '/api/emi/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loanAmount: 1000000,
      annualInterestRate: 10.5,
      tenureMonths: 60
    })
  });

  // 4. Credit Score Analyze API
  await testEndpoint('Credit Score Analyze API', '/api/credit/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creditScore: 780,
      paymentHistory: 'excellent',
      creditUtilization: 20,
      creditHistoryLength: 5,
      activeLoans: 2,
      recentInquiries: 1
    })
  });

  // 5. AI Chat API
  await testEndpoint('AI Chat Advisory API', '/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'What is the standard FOIR percentage that banks require?'
    })
  });

  // 6. Applications History API
  await testEndpoint('Get Applications History', '/api/applications');

  // 7. Pages Verification
  const pages = [
    '/',
    '/dashboard',
    '/eligibility',
    '/emi-calculator',
    '/credit-analyzer',
    '/ai-assistant',
    '/history',
    '/settings'
  ];

  console.log('\n--- Web Page Routes Verification ---');
  for (const p of pages) {
    await testEndpoint(`Web Page: ${p}`, p);
  }

  console.log('\nAll tests executed.\n');
}

runLiveVerification();
