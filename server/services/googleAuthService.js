const { google } = require('googleapis');
const config = require('../config/config');
const logger = require('../utils/logger');

class GoogleAuthService {
  constructor() {
    this.clientId = config.GOOGLE_OAUTH.CLIENT_ID;
    this.clientSecret = config.GOOGLE_OAUTH.CLIENT_SECRET;
    this.redirectUri = config.GOOGLE_OAUTH.REDIRECT_URI;
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  getClientId() {
    return this.clientId || '';
  }

  getEffectiveRedirectUri(req) {
    if (this.redirectUri) {
      return this.redirectUri;
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}/api/auth/google/callback`;
  }

  createOAuth2Client(redirectUri) {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      redirectUri
    );
  }

  generateAuthUrl(req, state = '') {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
    }

    const redirectUri = this.getEffectiveRedirectUri(req);
    const client = this.createOAuth2Client(redirectUri);

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state || 'finai_auth_state'
    });
  }

  async exchangeCodeForProfile(code, req) {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth is not configured. Missing credentials.');
    }

    const redirectUri = this.getEffectiveRedirectUri(req);
    const client = this.createOAuth2Client(redirectUri);

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();

    if (!data.email) {
      throw new Error('Unable to retrieve email from Google profile.');
    }

    return {
      googleId: data.id,
      email: data.email.toLowerCase(),
      fullName: data.name || data.email.split('@')[0],
      avatarUrl: data.picture || null,
      emailVerified: Boolean(data.verified_email)
    };
  }

  async verifyIdToken(idToken) {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth is not configured.');
    }

    const client = this.createOAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: this.clientId
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Invalid Google ID token payload.');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      fullName: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture || null,
      emailVerified: Boolean(payload.email_verified)
    };
  }
}

module.exports = new GoogleAuthService();
