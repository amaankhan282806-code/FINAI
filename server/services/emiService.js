const { calculateEMI } = require('../utils/calculations');

class EmiService {
  compute(loanAmount, annualInterestRate, tenureMonths) {
    return calculateEMI(loanAmount, annualInterestRate, tenureMonths);
  }
}

module.exports = new EmiService();
