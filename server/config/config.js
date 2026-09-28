require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'finai_default_jwt_secret_dev_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // AI Provider Keys (Supports Free Google Gemini, Free Groq, or Claude)
  AI: {
    // 1. Google Gemini (100% Free at aistudio.google.com)
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',

    // 2. Groq (100% Free at console.groq.com)
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

    // 3. Anthropic Claude
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
  },

  // Backward compatibility
  ANTHROPIC: {
    API_KEY: process.env.ANTHROPIC_API_KEY || '',
    MODEL: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
  },
  
  // Google Sheets Integration
  GOOGLE_SHEETS: {
    WEBHOOK_URL: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
    SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
    SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    PRIVATE_KEY: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  },

  // Business Rules for Loan Eligibility
  ELIGIBILITY_RULES: {
    MIN_SALARY: 30000,           // ₹30,000 / month
    MIN_CREDIT_SCORE: 700,        // Minimum credit score
    MAX_EXISTING_EMI: 20000,      // Max existing monthly EMI obligations
    MIN_AGE: 21,                 // Minimum age
    MAX_AGE: 65,                 // Maximum age at loan maturity
    SALARY_MULTIPLIER: 20,       // Indicative Eligible Amount = Salary * 20
    MAX_FOIR: 0.50               // Fixed Obligation to Income Ratio (50%)
  },

  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
