const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`Unhandled Error: ${err.message}`, err.stack);

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? (statusCode === 500 ? 'An unexpected internal server error occurred.' : err.message)
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    status: statusCode
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
