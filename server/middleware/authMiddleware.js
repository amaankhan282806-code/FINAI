const jwt = require('jsonwebtoken');
const config = require('../config/config');
const storageService = require('../services/storageService');

const revokedTokens = new Set();

function revokeToken(token) {
  if (token && typeof token === 'string') {
    revokedTokens.add(token);
  }
}

function isTokenRevoked(token) {
  return revokedTokens.has(token);
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Optional Auth (Supports guest mode seamlessly)
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token || isTokenRevoked(token)) {
    req.user = {
      id: 'usr_demo_finai',
      fullName: 'Rahul Sharma',
      email: 'demo@finai.bank',
      isGuest: true
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = storageService.findUserById(decoded.id);
    req.user = user ? { ...user, isGuest: false } : { id: decoded.id, email: decoded.email, isGuest: false };
    next();
  } catch (err) {
    // If token invalid or expired, fallback to guest gracefully
    req.user = {
      id: 'usr_demo_finai',
      fullName: 'Rahul Sharma',
      email: 'demo@finai.bank',
      isGuest: true
    };
    next();
  }
}

// Strict Auth for protected actions
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token || isTokenRevoked(token)) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (decoded.id === 'usr_demo_finai') {
      req.user = {
        id: 'usr_demo_finai',
        fullName: decoded.fullName || 'Rahul Sharma',
        email: decoded.email || 'demo@finai.bank',
        isGuest: false
      };
      return next();
    }
    const user = storageService.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User account not found.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication session.'
    });
  }
}

module.exports = {
  optionalAuth,
  requireAuth,
  revokeToken,
  isTokenRevoked
};
