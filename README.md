# FINAI — AI Loan Eligibility Checker & BFSI Financial Platform

A modern, responsive, and production-oriented **AI Loan Eligibility Checker** web application built for the Banking, Financial Services, and Insurance (BFSI) domain.

FINAI empowers borrowers and financial institutions to evaluate indicative loan eligibility, calculate EMIs with interactive amortizations, analyze credit score health, and receive personalized financial advice powered by **Anthropic Claude AI**.

---

## 🌟 Key Features

### 1. Loan Eligibility Checker
* Evaluates applicant criteria: Monthly Salary, Age, Credit Score, Debt Obligations, and Tenure.
* **Underwriting Business Rules**:
  * Minimum Net Monthly Salary: **₹30,000**
  * Minimum Credit Score (CIBIL benchmark): **700 points**
  * Maximum Existing EMI Obligations: **₹20,000 / month**
  * Applicant Age: **21 to 65 years**
  * **Indicative Borrowing Limit**: `Monthly Salary × 20`
* Clear criteria breakdown with Pass/Fail indicators and actionable improvement recommendations.
* 1-Click quick presets: *Prime Salaried*, *Starter Professional*, and *Needs Improvement*.

### 2. Interactive EMI Calculator
* Mathematical precision using standard reducing-balance loan formula:
  $$\text{EMI} = P \times R \times \frac{(1+R)^N}{(1+R)^N - 1}$$
* Synchronized sliders and numeric inputs for instant updates.
* Interactive **Chart.js Doughnut Chart** showing Principal vs. Interest percentage breakdown.
* Detailed **Amortization Schedule** with Yearly Summary, Monthly Breakdown with pagination, and **Export to CSV** feature.

### 3. Credit Score Analyzer
* Analyzes credit health across a 300–900 scale.
* Visual gauge meter with needle animation and risk category badges (*Prime, Very Good, Good, Fair, Poor*).
* Evaluates the **5 Core Credit Dimensions**:
  * Payment History (35% weight)
  * Credit Card Utilization Ratio (30% weight)
  * Credit History Age (15% weight)
  * Active Debt & Credit Mix (10% weight)
  * Recent Inquiries (10% weight)
* Factor rating radar chart and educational credit management recommendations.

### 4. Anthropic Claude AI Financial Assistant
* Secure backend integration with **Anthropic Claude 3.5 Sonnet** (`@anthropic-ai/sdk`).
* Explains loan eligibility results, FOIR calculations, and financial terminology in plain language.
* Context-aware: seamlessly pulls user evaluation history into the prompt session.
* Built-in intelligent **BFSI Domain Knowledge Engine** fallback when an Anthropic API key is not yet configured.

### 5. Application History & Data Store
* Comprehensive audit trail of all loan evaluations.
* Search and filter by applicant name, reference ID, and approval status.
* Full detail view modal and CSV data export.

### 6. Google Sheets Integration
* Dual sync support:
  * **Method A**: Google Apps Script Webhook (zero OAuth hassle, setup in 60 seconds).
  * **Method B**: Official Google Sheets API v4 using Google Service Accounts.
* Resilient fallback to a local JSON database with pre-seeded BFSI demo records.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Modern Glassmorphism Design System), Vanilla ES6+ JavaScript, Chart.js, Lucide Icons, Plus Jakarta Sans |
| **Backend** | Node.js, Express.js (REST API Architecture) |
| **AI Integration** | Anthropic Claude API (`@anthropic-ai/sdk`), BFSI Domain Knowledge Engine |
| **Data Storage** | Google Sheets API v4, Google Apps Script, Local JSON Persistence |
| **Security** | Helmet (CSP configured), CORS, Express Rate Limiter, bcryptjs, JSON Web Tokens (JWT) |

---

## 📁 Project Architecture

```text
FINAI/
├── public/                       # Static frontend client files
│   ├── index.html                # Landing page & Auth modal
│   ├── dashboard.html            # Main User Dashboard
│   ├── eligibility.html          # Loan Eligibility Checker (Module 1)
│   ├── emi-calculator.html       # Dynamic EMI Calculator (Module 2)
│   ├── credit-analyzer.html      # Credit Score Analyzer (Module 3)
│   ├── ai-assistant.html         # Claude AI Financial Assistant (Module 4)
│   ├── history.html              # Application History (Module 6)
│   ├── settings.html             # Settings & Integrations
│   ├── css/
│   │   ├── style.css             # Design tokens & color system
│   │   ├── dashboard.css         # Shell, sidebar & layout cards
│   │   ├── components.css        # Buttons, inputs, modals, chat UI
│   │   └── responsive.css       # Mobile drawer & breakpoints
│   └── js/
│       ├── config.js             # API base URL & endpoints
│       ├── app.js                # Shared utilities (₹ format, toasts, auth)
│       ├── dashboard.js          # Dashboard charts & metrics
│       ├── eligibility.js        # Eligibility form & results renderer
│       ├── emi-calculator.js     # EMI math & amortization pagination
│       ├── credit-analyzer.js    # Credit gauge & radar chart
│       ├── ai-assistant.js       # Claude chat UI & markdown parser
│       ├── history.js            # Applications filtering & CSV export
│       └── settings.js           # Status tests & profile sync
├── server/                       # Node.js Express Backend
│   ├── config/
│   │   └── config.js             # Environment variables & business rules
│   ├── controllers/              # Request handlers
│   │   ├── eligibilityController.js
│   │   ├── emiController.js
│   │   ├── creditController.js
│   │   ├── aiController.js
│   │   ├── applicationController.js
│   │   └── authController.js
│   ├── routes/                   # REST API routes
│   │   ├── eligibilityRoutes.js
│   │   ├── emiRoutes.js
│   │   ├── creditRoutes.js
│   │   ├── aiRoutes.js
│   │   ├── applicationRoutes.js
│   │   ├── authRoutes.js
│   │   └── healthRoutes.js
│   ├── services/                 # Business logic & external APIs
│   │   ├── eligibilityService.js
│   │   ├── emiService.js
│   │   ├── creditService.js
│   │   ├── aiService.js          # Anthropic Claude & BFSI engine
│   │   ├── googleSheetsService.js# Google Sheets sync & test
│   │   └── storageService.js     # Local JSON persistence
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT & Demo user session
│   │   ├── errorHandler.js       # Safe error formatting
│   │   ├── rateLimiter.js        # DDoS & prompt throttling
│   │   └── validation.js         # Input sanitization
│   └── utils/
│       ├── calculations.js       # Core financial algorithms
│       └── logger.js             # Formatted timestamp logger
├── tests/
│   └── run-tests.js              # Automated unit tests for rules & math
├── data/                         # Local database folder (auto-generated)
├── google-sheets-script.js       # Ready-to-deploy Google Apps Script
├── .env.example                  # Environment configuration template
├── .gitignore
├── package.json
├── server.js                     # Express entry point
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Node.js** (v18.0.0 or higher)
* **npm** (v9.0.0 or higher)

### 2. Installation
Open your terminal in the `FINAI` directory:

```bash
cd FINAI
npm install
```

### 3. Run Automated Tests
Verify all business rules, EMI mathematics, and credit analysis matrix:

```bash
npm test
```
*Expected: 12 tests passed, 0 failed.*

### 4. Start Local Development Server
```bash
npm start
```
Or with auto-restart on changes:
```bash
npm run dev
```

### 5. Access Application
Open your browser and navigate to:
**[http://localhost:5000](http://localhost:5000)**

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in the `FINAI` root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the Express web server |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `JWT_SECRET` | `your_secret_key` | Secret string for signing auth tokens |
| `ANTHROPIC_API_KEY` | *(optional)* | Anthropic API key from [console.anthropic.com](https://console.anthropic.com/) |
| `ANTHROPIC_MODEL` | `claude-3-5-sonnet-20241022` | Claude model identifier |
| `GOOGLE_SHEETS_WEBHOOK_URL`| *(optional)* | Google Apps Script Web App Deployment URL |
| `GOOGLE_SHEETS_SPREADSHEET_ID`| *(optional)* | Google Spreadsheet ID (for Service Account) |

> **Note:** The application is fully functional out of the box even without API keys. If `ANTHROPIC_API_KEY` is not provided, FINAI automatically operates using its built-in BFSI Domain Knowledge Engine. If Google Sheets is not configured, records persist safely in `data/local_db.json`.

---

## 🤖 Anthropic Claude AI Configuration

To enable live Claude 3.5 Sonnet:
1. Sign up at [console.anthropic.com](https://console.anthropic.com/).
2. Generate an API Key under **API Keys**.
3. Set the key in your `.env` file:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
4. Restart the server (`npm start`). The assistant in `/ai-assistant.html` will immediately display **Claude 3.5 Sonnet Live**.

---

## 📊 Google Sheets Setup (60 Seconds)

1. Open Google Sheets ([sheets.new](https://sheets.new)) and create a new sheet.
2. Name the tab **`Applications`** and add column headers in Row 1:
   * `Timestamp`, `Reference ID`, `Full Name`, `Employment Type`, `Monthly Salary (INR)`, `Credit Score`, `Existing EMI (INR)`, `Requested Amount (INR)`, `Tenure (Months)`, `Indicative Limit (INR)`, `Status`, `Health Score`
3. Click **Extensions > Apps Script**.
4. Copy and paste the contents of `FINAI/google-sheets-script.js`.
5. Click **Deploy > New Deployment**:
   * Select type: **Web app**
   * Execute as: **Me**
   * Who has access: **Anyone**
6. Copy the **Web App URL** and add to `.env`:
   ```env
   GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```
7. Go to **Settings & Config** in FINAI and click **Test Connection** to verify.

---

## 📡 REST API Documentation

### 1. Loan Eligibility
* `POST /api/eligibility/check`
  * **Body**:
    ```json
    {
      "fullName": "Rahul Sharma",
      "age": 29,
      "employmentType": "Salaried",
      "monthlySalary": 75000,
      "creditScore": 780,
      "existingEmi": 12000,
      "desiredLoanAmount": 1200000,
      "loanTenureMonths": 60
    }
    ```
  * **Response**: Returns evaluation status, indicative eligible amount, criteria breakdown, and suggestions.

### 2. EMI Calculator
* `POST /api/emi/calculate`
  * **Body**: `{ "loanAmount": 1000000, "annualInterestRate": 10.5, "tenureMonths": 60 }`
  * **Response**: Returns monthly EMI, total interest, total repayment, and amortization tables.

### 3. Credit Score Analyzer
* `POST /api/credit/analyze`
  * **Body**: `{ "creditScore": 750, "paymentHistory": "excellent", "creditUtilization": 25, "creditHistoryLength": 4, "activeLoans": 2, "recentInquiries": 1 }`
  * **Response**: Categorical rating, approval likelihood, factor scores, and improvement tips.

### 4. Claude AI Financial Chat
* `POST /api/ai/chat`
  * **Body**: `{ "message": "How do I increase my loan limit?", "history": [...], "context": {...} }`
  * **Response**: Markdown-formatted advice with domain guidance and disclaimer.

### 5. Application Records
* `GET /api/applications` — Fetch user loan evaluations.
* `GET /api/applications/:id` — Fetch detailed evaluation by reference ID.
* `POST /api/applications` — Save evaluation record.
* `DELETE /api/applications/:id` — Remove record.

### 6. System Health
* `GET /api/health` — System status and integrated service indicators.

---

## 🔒 Security & Best Practices

* **Zero Hardcoded Secrets**: All keys, secrets, and configurations reside exclusively in environment variables.
* **Content Security Policy (CSP)**: Powered by `helmet`, allowing only whitelisted CDNs for Chart.js and Lucide icons.
* **Rate Limiting**: Protects AI chat endpoints and auth endpoints against brute force and DDoS.
* **Data Sanitization**: Strict schema validation ensures malicious payloads are rejected prior to processing.
* **Regulatory Compliance**: Explicit financial disclaimers communicate that evaluations are indicative estimations, not guaranteed banking commitments.

---

## ⚖️ License
MIT License. Built for educational and professional fintech prototyping.
