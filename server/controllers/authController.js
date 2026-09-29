const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const storageService = require('../services/storageService');
const googleAuthService = require('../services/googleAuthService');
const authMiddleware = require('../middleware/authMiddleware');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, fullName: user.fullName },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

async function register(req, res, next) {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Full name, email, and password are required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.'
      });
    }

    if (confirmPassword !== undefined && confirmPassword !== null && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = storageService.findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = storageService.createUser({
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash
    });

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully. Please sign in with your credentials.',
      token,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = storageService.findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
}

function getMe(req, res) {
  res.status(200).json({
    success: true,
    user: req.user
  });
}

function logout(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (authMiddleware.revokeToken) {
      authMiddleware.revokeToken(token);
    }
  }
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
}

function demoLogin(req, res) {
  const demoUser = {
    id: 'usr_demo_finai',
    fullName: 'Rahul Sharma',
    email: 'demo@finai.bank',
    isGuest: false
  };

  const token = generateToken(demoUser);

  res.status(200).json({
    success: true,
    message: 'Welcome to FINAI Demo Mode.',
    token,
    user: demoUser
  });
}

async function initiateGoogleAuth(req, res, next) {
  try {
    if (!googleAuthService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.'
      });
    }
    const state = Buffer.from(JSON.stringify({ timestamp: Date.now(), returnTo: req.query.returnTo || '/dashboard.html' })).toString('base64');
    const authUrl = googleAuthService.generateAuthUrl(req, state);
    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
}

async function googleAuthCallback(req, res, next) {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`/login.html?error=google_${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect('/login.html?error=missing_oauth_code');
    }

    const profile = await googleAuthService.exchangeCodeForProfile(code, req);

    let user = storageService.findUserByEmail(profile.email);
    if (!user) {
      user = storageService.createUser({
        fullName: profile.fullName,
        email: profile.email,
        provider: 'google',
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl
      });
    }

    const token = generateToken(user);
    const safeUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      provider: user.provider || 'google',
      avatarUrl: user.avatarUrl || profile.avatarUrl
    };

    const redirectUrl = `/login.html?token=${token}&user=${encodeURIComponent(JSON.stringify(safeUser))}&auth_success=google`;
    res.redirect(redirectUrl);
  } catch (err) {
    res.redirect(`/login.html?error=${encodeURIComponent(err.message || 'OAuth authentication failed')}`);
  }
}

async function googleTokenAuth(req, res, next) {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google credential ID token is required.' });
    }

    const profile = await googleAuthService.verifyIdToken(credential);

    let user = storageService.findUserByEmail(profile.email);
    if (!user) {
      user = storageService.createUser({
        fullName: profile.fullName,
        email: profile.email,
        provider: 'google',
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Signed in with Google successfully.',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        provider: user.provider || 'google',
        avatarUrl: user.avatarUrl || profile.avatarUrl
      }
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: `Google authentication failed: ${err.message}`
    });
  }
}

function getGoogleAuthStatus(req, res) {
  res.status(200).json({
    success: true,
    configured: googleAuthService.isConfigured(),
    clientId: googleAuthService.getClientId()
  });
}

function googleMockAuth(req, res) {
  const email = (req.body && req.body.email) ? req.body.email.toLowerCase() : 'google.test@finai.bank';
  const fullName = (req.body && req.body.fullName) ? req.body.fullName : 'Google Verified User';

  let user = storageService.findUserByEmail(email);
  if (!user) {
    user = storageService.createUser({
      fullName,
      email,
      provider: 'google',
      googleId: 'g_mock_' + Date.now(),
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user'
    });
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Signed in with Google Test Profile.',
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      provider: 'google',
      avatarUrl: user.avatarUrl
    }
  });
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  demoLogin,
  initiateGoogleAuth,
  googleAuthCallback,
  googleTokenAuth,
  getGoogleAuthStatus,
  googleMockAuth
};
