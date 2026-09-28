const { analyzeCreditScore } = require('../utils/calculations');

class CreditService {
  analyze(creditData) {
    return analyzeCreditScore(creditData);
  }
}

module.exports = new CreditService();
