const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Initial seed data for demo presentation & cold start resilience
const DEFAULT_APPLICATIONS = [
  {
    id: 'APP-2026-9647',
    userId: 'usr_demo_finai',
    fullName: 'Vikram Malhotra',
    status: 'ELIGIBLE',
    statusLabel: 'Highly Eligible',
    badgeColor: 'success',
    isEligible: true,
    indicativeEligibleAmount: 1600000,
    requestedLoanAmount: 1600000,
    monthlySalary: 80000,
    creditScore: 760,
    existingEmi: 15000,
    loanTenureMonths: 60,
    employmentType: 'Salaried',
    age: 31,
    healthScore: 82,
    availableEmiCapacity: 25000,
    checks: [
      {
        key: 'salary',
        label: 'Monthly Salary Requirement',
        passed: true,
        actual: 80000,
        required: 30000,
        message: 'Salary of ₹80,000 meets the minimum requirement of ₹30,000.'
      },
      {
        key: 'creditScore',
        label: 'Credit Score Threshold',
        passed: true,
        actual: 760,
        required: 700,
        message: 'Credit score of 760 is healthy (minimum required: 700).'
      },
      {
        key: 'existingEmi',
        label: 'Existing Debt Obligations',
        passed: true,
        actual: 15000,
        required: 20000,
        message: 'Existing monthly EMI of ₹15,000 is well within manageable limits (max ₹20,000).'
      },
      {
        key: 'age',
        label: 'Age Eligibility Criteria',
        passed: true,
        actual: 31,
        required: '21 - 65 years',
        message: 'Applicant age of 31 meets the eligible working age bracket.'
      }
    ],
    suggestions: [
      'Your financial profile looks strong! Maintaining low credit card utilization and stable employment will help secure competitive interest rates.'
    ],
    evaluatedAt: '2026-09-28T16:47:54.658Z',
    disclaimer: 'This evaluation provides indicative guidance based on preliminary criteria and does not constitute a guaranteed loan approval or credit commitment from any financial institution.',
    createdAt: '2026-09-28T16:47:54.659Z'
  },
  {
    id: 'APP-2026-8941',
    userId: 'usr_demo_finai',
    fullName: 'Rahul Sharma',
    age: 29,
    monthlySalary: 75000,
    employmentType: 'Salaried',
    creditScore: 780,
    existingEmi: 12000,
    desiredLoanAmount: 1200000,
    loanTenureMonths: 60,
    indicativeEligibleAmount: 1500000,
    status: 'ELIGIBLE',
    statusLabel: 'Highly Eligible',
    healthScore: 88,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    checks: [
      { key: 'salary', label: 'Monthly Salary Requirement', passed: true, actual: 75000, required: 30000 },
      { key: 'creditScore', label: 'Credit Score Threshold', passed: true, actual: 780, required: 700 },
      { key: 'existingEmi', label: 'Existing Debt Obligations', passed: true, actual: 12000, required: 20000 },
      { key: 'age', label: 'Age Eligibility Criteria', passed: true, actual: 29, required: '21 - 65 years' }
    ],
    suggestions: [
      'Your financial profile looks strong! Maintaining low credit card utilization and stable employment will help secure competitive interest rates.'
    ]
  },
  {
    id: 'APP-2026-6732',
    userId: 'usr_demo_finai',
    fullName: 'Priya Patel',
    age: 24,
    monthlySalary: 42000,
    employmentType: 'Self-Employed',
    creditScore: 715,
    existingEmi: 8500,
    desiredLoanAmount: 840000,
    loanTenureMonths: 48,
    indicativeEligibleAmount: 840000,
    status: 'ELIGIBLE',
    statusLabel: 'Highly Eligible',
    healthScore: 79,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    checks: [
      { key: 'salary', label: 'Monthly Salary Requirement', passed: true, actual: 42000, required: 30000 },
      { key: 'creditScore', label: 'Credit Score Threshold', passed: true, actual: 715, required: 700 },
      { key: 'existingEmi', label: 'Existing Debt Obligations', passed: true, actual: 8500, required: 20000 },
      { key: 'age', label: 'Age Eligibility Criteria', passed: true, actual: 24, required: '21 - 65 years' }
    ],
    suggestions: [
      'Maintain steady business turnover statements to expedite verification with lending underwriters.'
    ]
  },
  {
    id: 'APP-2026-4519',
    userId: 'usr_demo_finai',
    fullName: 'Amit Verma',
    age: 26,
    monthlySalary: 28000,
    employmentType: 'Salaried',
    creditScore: 660,
    existingEmi: 16000,
    desiredLoanAmount: 600000,
    loanTenureMonths: 36,
    indicativeEligibleAmount: 480000,
    status: 'NEEDS_IMPROVEMENT',
    statusLabel: 'Requires Improvement',
    healthScore: 54,
    createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    checks: [
      { key: 'salary', label: 'Monthly Salary Requirement', passed: false, actual: 28000, required: 30000 },
      { key: 'creditScore', label: 'Credit Score Threshold', passed: false, actual: 660, required: 700 },
      { key: 'existingEmi', label: 'Existing Debt Obligations', passed: true, actual: 16000, required: 20000 },
      { key: 'age', label: 'Age Eligibility Criteria', passed: true, actual: 26, required: '21 - 65 years' }
    ],
    suggestions: [
      'Consider adding a co-applicant to reach the combined ₹30,000 threshold.',
      'Work on raising credit score above 700 by clearing overdue balances.'
    ]
  }
];

const DEFAULT_USERS = [
  {
    id: 'usr_demo_finai',
    fullName: 'Rahul Sharma',
    email: 'demo@finai.bank',
    passwordHash: '$2b$10$PNfJ4.1xYOKaR7DQ3EVohejN/BYWirnUJZpTq2VL7HLcX5dzB/YWC',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

class StorageService {
  constructor() {
    this.memoryApplications = JSON.parse(JSON.stringify(DEFAULT_APPLICATIONS));
    this.memoryUsers = JSON.parse(JSON.stringify(DEFAULT_USERS));
    this.memoryActivities = [];
    this.dataDir = this.resolveDataDirectory();
    this.dbFile = path.join(this.dataDir, 'local_db.json');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.initDb();
  }

  /**
   * Dynamically resolves the storage directory based on the execution runtime.
   * On Vercel / AWS Lambda (/var/task read-only), uses the writable /tmp directory.
   * On local dev, uses local data/ directory if writable, or falls back to os.tmpdir().
   */
  resolveDataDirectory() {
    const isServerless = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT ||
      process.env.NOW_REGION
    );

    if (isServerless) {
      const serverlessDir = path.join(os.tmpdir(), 'finai-data');
      logger.info(`Serverless environment detected (Vercel/Lambda). Using writable storage path: ${serverlessDir}`);
      this.ensureDirExists(serverlessDir);
      return serverlessDir;
    }

    // Local environment: check if project data directory is accessible and writable
    const localDir = path.join(__dirname, '../../data');
    try {
      this.ensureDirExists(localDir);
      // Verify writability
      const testFile = path.join(localDir, `.write_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'test', 'utf-8');
      fs.unlinkSync(testFile);
      return localDir;
    } catch (err) {
      logger.warn(`Project data directory is read-only or inaccessible (${err.message}). Falling back to temp directory.`);
      const fallbackDir = path.join(os.tmpdir(), 'finai-data');
      this.ensureDirExists(fallbackDir);
      return fallbackDir;
    }
  }

  /**
   * Safely ensures a directory exists without throwing unhandled exceptions.
   */
  ensureDirExists(dir) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return true;
    } catch (err) {
      logger.warn(`Notice: directory creation for ${dir} skipped (${err.message}). Memory store active.`);
      return false;
    }
  }

  /**
   * Initializes database files and in-memory caches safely.
   */
  initDb() {
    try {
      // 1. Check if bundled seed data exists in the application root (read-only read is safe)
      const bundledDbFile = path.join(__dirname, '../../data/local_db.json');
      if (fs.existsSync(bundledDbFile)) {
        try {
          const raw = fs.readFileSync(bundledDbFile, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.applications) && parsed.applications.length > 0) {
            this.memoryApplications = parsed.applications;
          }
          if (parsed && Array.isArray(parsed.activities)) {
            this.memoryActivities = parsed.activities;
          }
        } catch (e) {
          // Bundled file was empty or unparseable, default seed already loaded
        }
      }

      // 2. If the active writable DB file already exists, load its content
      if (fs.existsSync(this.dbFile)) {
        try {
          const content = fs.readFileSync(this.dbFile, 'utf-8');
          const data = JSON.parse(content || '{}');
          if (data && Array.isArray(data.applications)) {
            this.memoryApplications = data.applications;
          }
          if (data && Array.isArray(data.activities)) {
            this.memoryActivities = data.activities;
          }
        } catch (err) {
          logger.warn('Failed reading existing db file, using memory data:', err.message);
        }
      } else {
        // Write initial data to writable storage
        this.writeDb({
          applications: this.memoryApplications,
          activities: this.memoryActivities
        });
      }

      // 3. Load users
      const bundledUsersFile = path.join(__dirname, '../../data/users.json');
      if (fs.existsSync(bundledUsersFile)) {
        try {
          const rawUsers = fs.readFileSync(bundledUsersFile, 'utf-8');
          const parsedUsers = JSON.parse(rawUsers);
          if (Array.isArray(parsedUsers)) {
            this.memoryUsers = parsedUsers;
          }
        } catch (e) {}
      }

      if (fs.existsSync(this.usersFile)) {
        try {
          const content = fs.readFileSync(this.usersFile, 'utf-8');
          const parsed = JSON.parse(content || '[]');
          if (Array.isArray(parsed)) {
            this.memoryUsers = parsed;
          }
        } catch (err) {
          logger.warn('Failed reading existing users file, using memory data:', err.message);
        }
      } else {
        this.writeUsers(this.memoryUsers);
      }
    } catch (err) {
      logger.error('Failed to initialize local JSON database (continuing with in-memory store):', err.message);
    }
  }

  readDb() {
    try {
      if (fs.existsSync(this.dbFile)) {
        const content = fs.readFileSync(this.dbFile, 'utf-8');
        const parsed = JSON.parse(content || '{}');
        if (parsed && Array.isArray(parsed.applications)) {
          this.memoryApplications = parsed.applications;
        }
        if (parsed && Array.isArray(parsed.activities)) {
          this.memoryActivities = parsed.activities;
        }
      }
    } catch (err) {
      logger.warn('Notice reading db file (serving from memory cache):', err.message);
    }
    return {
      applications: this.memoryApplications,
      activities: this.memoryActivities
    };
  }

  writeDb(data) {
    if (data && Array.isArray(data.applications)) {
      this.memoryApplications = data.applications;
    }
    if (data && Array.isArray(data.activities)) {
      this.memoryActivities = data.activities;
    }
    try {
      this.ensureDirExists(this.dataDir);
      fs.writeFileSync(this.dbFile, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      logger.warn('Notice writing to db file (data safely preserved in memory):', err.message);
      return true;
    }
  }

  getApplications(userId = null) {
    const db = this.readDb();
    if (!userId || userId === 'all' || userId === 'usr_demo_finai') {
      return [...db.applications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return [...db.applications]
      .filter(app => app.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getApplicationById(id) {
    const db = this.readDb();
    return db.applications.find(a => a.id === id) || null;
  }

  saveApplication(applicationData, userId = 'usr_demo_finai') {
    const db = this.readDb();
    const newRecord = {
      id: `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: userId || 'usr_demo_finai',
      ...applicationData,
      createdAt: new Date().toISOString()
    };
    db.applications.unshift(newRecord);
    this.writeDb(db);
    return newRecord;
  }

  deleteApplication(id, userId = null) {
    const db = this.readDb();
    const index = db.applications.findIndex(a => a.id === id && (!userId || a.userId === userId));
    if (index !== -1) {
      db.applications.splice(index, 1);
      this.writeDb(db);
      return true;
    }
    return false;
  }

  // Users Storage
  readUsers() {
    try {
      if (fs.existsSync(this.usersFile)) {
        const content = fs.readFileSync(this.usersFile, 'utf-8');
        const parsed = JSON.parse(content || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasDemo = parsed.some(u => u.id === 'usr_demo_finai');
          this.memoryUsers = hasDemo ? parsed : [...DEFAULT_USERS, ...parsed];
        }
      }
    } catch (err) {
      logger.warn('Notice reading users file (serving from memory cache):', err.message);
    }
    if (!this.memoryUsers || this.memoryUsers.length === 0) {
      this.memoryUsers = JSON.parse(JSON.stringify(DEFAULT_USERS));
    }
    return this.memoryUsers;
  }

  writeUsers(users) {
    if (Array.isArray(users)) {
      this.memoryUsers = users;
    }
    try {
      this.ensureDirExists(this.dataDir);
      fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2), 'utf-8');
      return true;
    } catch (err) {
      logger.warn('Notice writing users file (data safely preserved in memory):', err.message);
      return true;
    }
  }

  findUserByEmail(email) {
    const users = this.readUsers();
    return users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    const users = this.readUsers();
    return users.find(u => u.id === id);
  }

  createUser(userData) {
    const users = this.readUsers();
    const newUser = {
      id: `usr_${uuidv4().substring(0, 8)}`,
      fullName: userData.fullName,
      email: userData.email.toLowerCase(),
      passwordHash: userData.passwordHash,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    this.writeUsers(users);
    return newUser;
  }
}

module.exports = new StorageService();
