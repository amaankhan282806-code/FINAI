const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./server/config/config');
const logger = require('./server/utils/logger');
const { generalLimiter } = require('./server/middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./server/middleware/errorHandler');

// Route imports
const eligibilityRoutes = require('./server/routes/eligibilityRoutes');
const emiRoutes = require('./server/routes/emiRoutes');
const creditRoutes = require('./server/routes/creditRoutes');
const aiRoutes = require('./server/routes/aiRoutes');
const applicationRoutes = require('./server/routes/applicationRoutes');
const authRoutes = require('./server/routes/authRoutes');
const healthRoutes = require('./server/routes/healthRoutes');

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.anthropic.com", "https://script.google.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: config.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Apply rate limiting to API routes
app.use('/api', generalLimiter);

// API Routes (Mounted under /api)
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/emi', emiRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/applications', applicationRoutes);

// Additional direct mounts for serverless environments where /api is stripped by routing rules
app.use('/', healthRoutes);
app.use('/auth', authRoutes);
app.use('/eligibility', eligibilityRoutes);
app.use('/emi', emiRoutes);
app.use('/credit', creditRoutes);
app.use('/ai', aiRoutes);
app.use('/applications', applicationRoutes);

// Static files from /public
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Clean URL routing for HTML pages
const pages = [
  'dashboard',
  'eligibility',
  'emi-calculator',
  'credit-analyzer',
  'ai-assistant',
  'history',
  'settings'
];

pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(publicPath, `${page}.html`));
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// API 404 handler
app.use('/api/*', notFoundHandler);

// Fallback to index.html for unknown web paths
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Global Error Handler
app.use(errorHandler);

// Start Server with Automatic Port Conflict Handling (for local development)
function startServer(port) {
  const srv = app.listen(port, () => {
    logger.info(`=======================================================`);
    logger.info(` FINAI — AI Loan Eligibility Checker Server Started!   `);
    logger.info(` Access URL:   http://localhost:${port}                `);
    const aiService = require('./server/services/aiService');
    logger.info(` AI Engine:    ${aiService.getActiveProviderName()}`);
    logger.info(` Google Sheets:${config.GOOGLE_SHEETS.WEBHOOK_URL || config.GOOGLE_SHEETS.SPREADSHEET_ID ? 'Configured' : 'Local JSON Mode'}`);
    logger.info(` Runtime:      ${process.env.VERCEL ? 'Vercel Serverless' : 'Local Node.js'}`);
    logger.info(`=======================================================`);
  });

  srv.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is in use. Automatically switching to port ${port + 1}...`);
      startServer(port + 1);
    } else {
      logger.error('Server error:', err.message);
    }
  });

  return srv;
}

// Export the Express app as default for Vercel Serverless Function compatibility
module.exports = app;
module.exports.app = app;

// Only bind to TCP port if run directly (node server.js / npm start) and not in Vercel serverless
if (require.main === module && !process.env.VERCEL) {
  const currentPort = Number(config.PORT);
  const server = startServer(currentPort);
  module.exports.server = server;
}
