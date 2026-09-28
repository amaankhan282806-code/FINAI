const { google } = require('googleapis');
const config = require('../config/config');
const logger = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    this.webhookUrl = config.GOOGLE_SHEETS.WEBHOOK_URL;
    this.spreadsheetId = config.GOOGLE_SHEETS.SPREADSHEET_ID;
    this.serviceAccountEmail = config.GOOGLE_SHEETS.SERVICE_ACCOUNT_EMAIL;
    this.privateKey = config.GOOGLE_SHEETS.PRIVATE_KEY;
    this.isConfigured = Boolean(
      this.webhookUrl || 
      (this.spreadsheetId && this.serviceAccountEmail && this.privateKey)
    );
  }

  getStatus() {
    return {
      isConfigured: this.isConfigured,
      mode: this.webhookUrl ? 'Apps Script Webhook' : (this.spreadsheetId ? 'Google Sheets API v4' : 'Local Storage Mode'),
      spreadsheetId: this.spreadsheetId ? `${this.spreadsheetId.substring(0, 6)}...` : null,
      webhookConfigured: Boolean(this.webhookUrl),
      limitationsNotice: 'Google Sheets is an auxiliary data store for lightweight operational tracking. It does not replace ACID-compliant, encrypted banking databases.'
    };
  }

  /**
   * Syncs an application record to Google Sheets
   */
  async syncApplication(applicationData) {
    if (!this.isConfigured) {
      logger.info('Google Sheets sync skipped (no credentials configured in .env). Data preserved in local storage.');
      return {
        synced: false,
        method: 'local-only',
        message: 'Saved to local database. Google Sheets credentials not configured.'
      };
    }

    // Sanitized structured record for Sheets
    const row = {
      timestamp: new Date().toISOString(),
      referenceId: applicationData.id || 'N/A',
      fullName: applicationData.fullName || 'N/A',
      monthlySalary: applicationData.monthlySalary || 0,
      creditScore: applicationData.creditScore || 0,
      existingEmi: applicationData.existingEmi || 0,
      desiredLoanAmount: applicationData.desiredLoanAmount || 0,
      loanTenureMonths: applicationData.loanTenureMonths || 0,
      indicativeEligibleAmount: applicationData.indicativeEligibleAmount || 0,
      status: applicationData.status || 'PENDING',
      statusLabel: applicationData.statusLabel || '',
      healthScore: applicationData.healthScore || 0,
      employmentType: applicationData.employmentType || 'Salaried'
    };

    // Method 1: Google Apps Script Webhook
    if (this.webhookUrl) {
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row)
        });

        if (!response.ok) {
          throw new Error(`Apps Script responded with HTTP ${response.status}`);
        }

        const data = await response.json();
        logger.info(`Synced application ${row.referenceId} to Google Sheets via Webhook.`);
        return { synced: true, method: 'webhook', details: data };
      } catch (err) {
        logger.error('Google Sheets Webhook sync error:', err.message);
        return { synced: false, error: err.message, method: 'webhook' };
      }
    }

    // Method 2: Google Sheets API v4 via Service Account
    if (this.spreadsheetId && this.serviceAccountEmail && this.privateKey) {
      try {
        const auth = new google.auth.JWT({
          email: this.serviceAccountEmail,
          key: this.privateKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const values = [
          [
            row.timestamp,
            row.referenceId,
            row.fullName,
            row.employmentType,
            row.monthlySalary,
            row.creditScore,
            row.existingEmi,
            row.desiredLoanAmount,
            row.loanTenureMonths,
            row.indicativeEligibleAmount,
            row.status,
            row.healthScore
          ]
        ];

        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'Applications!A:L',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values }
        });

        logger.info(`Synced application ${row.referenceId} to Google Sheets via API v4.`);
        return { synced: true, method: 'api-v4', updatedCells: response.data.updates?.updatedCells };
      } catch (err) {
        logger.error('Google Sheets API v4 sync error:', err.message);
        return { synced: false, error: err.message, method: 'api-v4' };
      }
    }

    return { synced: false, method: 'none' };
  }

  /**
   * Health/Test endpoint to verify Sheets connectivity
   */
  async testConnection() {
    if (!this.isConfigured) {
      return {
        connected: false,
        message: 'Google Sheets credentials are not configured. To enable, add GOOGLE_SHEETS_WEBHOOK_URL or GOOGLE_SHEETS_SPREADSHEET_ID in .env'
      };
    }

    try {
      if (this.webhookUrl) {
        const res = await fetch(`${this.webhookUrl}?action=ping`, { method: 'GET' });
        return {
          connected: res.ok,
          message: res.ok ? 'Google Apps Script webhook reached successfully.' : `Status ${res.status}`
        };
      }
      return { connected: true, message: 'Google Sheets credentials detected.' };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  }
}

module.exports = new GoogleSheetsService();
