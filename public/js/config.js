/**
 * FINAI Frontend Global Configuration
 */
const CONFIG = {
  API_BASE_URL: window.location.origin + '/api',
  ENDPOINTS: {
    HEALTH: '/health',
    ELIGIBILITY_CHECK: '/eligibility/check',
    EMI_CALCULATE: '/emi/calculate',
    CREDIT_ANALYZE: '/credit/analyze',
    AI_CHAT: '/ai/chat',
    AI_STATUS: '/ai/status',
    APPLICATIONS: '/applications',
    SHEETS_STATUS: '/sheets/status',
    SHEETS_TEST: '/sheets/test',
    AUTH_LOGIN: '/auth/login',
    AUTH_REGISTER: '/auth/register',
    AUTH_DEMO: '/auth/demo',
    AUTH_ME: '/auth/me',
    AUTH_GOOGLE_INIT: '/auth/google',
    AUTH_GOOGLE_TOKEN: '/auth/google/token',
    AUTH_GOOGLE_STATUS: '/auth/google/status',
    AUTH_GOOGLE_MOCK: '/auth/google/mock',
    AUTH_LOGOUT: '/auth/logout'
  },
  STORAGE_KEYS: {
    AUTH_TOKEN: 'finai_token',
    USER_DATA: 'finai_user',
    LAST_ELIGIBILITY: 'finai_last_check',
    CHAT_HISTORY: 'finai_chat_history'
  }
};
