const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data for demo presentation
const DEFAULT_APPLICATIONS = [
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

class StorageService {
  constructor() {
    this.initDb();
  }

  initDb() {
    try {
      if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ applications: DEFAULT_APPLICATIONS, activities: [] }, null, 2));
      }
      if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
      }
    } catch (err) {
      logger.error('Failed to initialize local JSON database:', err.message);
    }
  }

  readDb() {
    try {
      if (!fs.existsSync(DB_FILE)) this.initDb();
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content || '{"applications":[],"activities":[]}');
    } catch (err) {
      logger.error('Error reading local db:', err.message);
      return { applications: [], activities: [] };
    }
  }

  writeDb(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      logger.error('Error writing to local db:', err.message);
      return false;
    }
  }

  getApplications(userId = null) {
    const db = this.readDb();
    if (!userId || userId === 'all' || userId === 'usr_demo_finai') {
      return db.applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return db.applications
      .filter(app => app.userId === userId || app.userId === 'usr_demo_finai')
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
      if (!fs.existsSync(USERS_FILE)) this.initDb();
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(content || '[]');
    } catch (err) {
      logger.error('Error reading users db:', err.message);
      return [];
    }
  }

  writeUsers(users) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
      return true;
    } catch (err) {
      logger.error('Error writing users db:', err.message);
      return false;
    }
  }

  findUserByEmail(email) {
    const users = this.readUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
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
