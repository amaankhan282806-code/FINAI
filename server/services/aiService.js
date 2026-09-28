const { Anthropic } = require('@anthropic-ai/sdk');
const config = require('../config/config');
const logger = require('../utils/logger');

const BFSI_SYSTEM_PROMPT = `You are FINAI, an expert AI Financial Advisor and Senior Lending Specialist.
Your primary role is to help users understand loan eligibility, EMI structures, credit scores, debt management, and banking products.

Key Guidelines:
1. Always maintain a professional, encouraging, and clear tone.
2. Clarify that you provide informational guidance, estimates, and educational assistance, not official credit underwriting or guaranteed loan approvals.
3. When discussing Indian BFSI topics, use Indian Rupee (₹) currency notation and standard Indian banking concepts (CIBIL score 300-900, FOIR - Fixed Obligation to Income Ratio, Tenures, Repo Linked Lending Rates).
4. Provide structured, actionable steps when a user asks how to improve loan eligibility or credit health.
5. If the user provides specific loan amounts or salaries, provide precise, reasoned financial breakdown.
6. Acknowledge uncertainty when information is incomplete and advise consulting licensed banking representatives or certified financial planners.`;

class AiService {
  constructor() {
    this.geminiKey = config.AI.GEMINI_API_KEY;
    this.geminiModel = config.AI.GEMINI_MODEL;

    this.groqKey = config.AI.GROQ_API_KEY;
    this.groqModel = config.AI.GROQ_MODEL;

    this.anthropicKey = config.AI.ANTHROPIC_API_KEY;
    this.anthropicModel = config.AI.ANTHROPIC_MODEL;

    this.claudeClient = null;
    if (this.anthropicKey) {
      try {
        this.claudeClient = new Anthropic({ apiKey: this.anthropicKey });
        logger.info(`Anthropic Claude initialized (${this.anthropicModel})`);
      } catch (err) {
        logger.error('Failed to init Anthropic client:', err.message);
      }
    }

    if (this.geminiKey) {
      logger.info(`Google Gemini AI active (${this.geminiModel}) - Free API`);
    } else if (this.groqKey) {
      logger.info(`Groq AI active (${this.groqModel}) - Free API`);
    } else if (!this.anthropicKey) {
      logger.info('No external AI API key configured. FINAI will run in BFSI Expert Offline mode.');
    }
  }

  isConfigured() {
    return Boolean(this.geminiKey || this.groqKey || (this.anthropicKey && this.claudeClient));
  }

  getActiveProviderName() {
    if (this.geminiKey) return `Google Gemini (${this.geminiModel})`;
    if (this.groqKey) return `Groq Cloud (${this.groqModel})`;
    if (this.anthropicKey) return `Anthropic Claude (${this.anthropicModel})`;
    return 'FINAI BFSI Domain Engine (Offline Fallback)';
  }

  /**
   * Processes a financial chat message with conversation history
   */
  async generateFinancialAdvice({ message, history = [], context = {} }) {
    if (!message || typeof message !== 'string') {
      throw new Error('Message is required and must be a string.');
    }

    let contextNote = '';
    if (context && Object.keys(context).length > 0) {
      contextNote = `[Current User Context: Salary: ₹${context.monthlySalary || 'N/A'}, Credit Score: ${context.creditScore || 'N/A'}, Existing EMI: ₹${context.existingEmi || 'N/A'}, Desired Loan: ₹${context.desiredLoanAmount || 'N/A'}]`;
    }
    const currentPrompt = contextNote ? `${contextNote}\n\nUser Question: ${message}` : message;

    // Option 1: Google Gemini API (100% Free at aistudio.google.com)
    if (this.geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiKey}`;
        
        // Build contents history
        const contents = [];
        const recentHistory = history.slice(-6);
        for (const item of recentHistory) {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content }]
          });
        }
        contents.push({
          role: 'user',
          parts: [{ text: currentPrompt }]
        });

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: BFSI_SYSTEM_PROMPT }]
            },
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024
            }
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gemini returned HTTP ${res.status}`);
        }

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          return {
            reply,
            model: `Google Gemini (${this.geminiModel})`,
            isLiveAi: true,
            provider: 'google-gemini',
            timestamp: new Date().toISOString()
          };
        }
      } catch (err) {
        logger.error('Gemini API call failed, falling back:', err.message);
      }
    }

    // Option 2: Groq API (100% Free at console.groq.com)
    if (this.groqKey) {
      try {
        const messages = [
          { role: 'system', content: BFSI_SYSTEM_PROMPT }
        ];
        const recentHistory = history.slice(-6);
        for (const item of recentHistory) {
          if (item.role === 'user' || item.role === 'assistant') {
            messages.push({ role: item.role, content: item.content });
          }
        }
        messages.push({ role: 'user', content: currentPrompt });

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.groqKey}`
          },
          body: JSON.stringify({
            model: this.groqModel,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Groq returned HTTP ${res.status}`);
        }

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return {
            reply,
            model: `Groq (${this.groqModel})`,
            isLiveAi: true,
            provider: 'groq',
            timestamp: new Date().toISOString()
          };
        }
      } catch (err) {
        logger.error('Groq API call failed, falling back:', err.message);
      }
    }

    // Option 3: Anthropic Claude API
    if (this.anthropicKey && this.claudeClient) {
      try {
        const messages = [];
        const recentHistory = history.slice(-6);
        for (const item of recentHistory) {
          if (item.role === 'user' || item.role === 'assistant') {
            messages.push({ role: item.role, content: item.content });
          }
        }
        messages.push({ role: 'user', content: currentPrompt });

        const response = await this.claudeClient.messages.create({
          model: this.anthropicModel,
          max_tokens: 1024,
          system: BFSI_SYSTEM_PROMPT,
          messages: messages
        });

        const replyText = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        return {
          reply: replyText,
          model: this.anthropicModel,
          isLiveAi: true,
          provider: 'anthropic',
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        logger.error('Claude API call failed, falling back:', err.message);
      }
    }

    // Option 4: Offline Intelligent BFSI Knowledge Engine Fallback
    const fallback = this.generateOfflineAdvice(message, context);
    return {
      ...fallback,
      isLiveAi: false,
      model: 'FINAI BFSI Engine (Offline)',
      note: 'Operating via FINAI BFSI Domain Engine. Add a free GEMINI_API_KEY or GROQ_API_KEY in .env for live cloud LLM.'
    };
  }

  /**
   * BFSI Domain Knowledge Engine for offline/instant evaluation
   */
  generateOfflineAdvice(query, context = {}) {
    const q = query.toLowerCase();

    // Contextual eligibility analysis
    if (context && context.monthlySalary && (q.includes('my eligibility') || q.includes('why was i rejected') || q.includes('improve'))) {
      const salary = Number(context.monthlySalary) || 0;
      const credit = Number(context.creditScore) || 0;
      const emi = Number(context.existingEmi) || 0;
      const desired = Number(context.desiredLoanAmount) || 0;
      const indicative = salary * 20;

      let analysis = `### 📊 Analysis of Your Profile:\n\n`;
      analysis += `- **Monthly Salary:** ₹${salary.toLocaleString('en-IN')}\n`;
      analysis += `- **Credit Score:** ${credit}\n`;
      analysis += `- **Existing EMI:** ₹${emi.toLocaleString('en-IN')}\n`;
      analysis += `- **Indicative Limit:** ₹${indicative.toLocaleString('en-IN')}\n\n`;

      if (credit < 700) {
        analysis += `⚠️ **Key Concern — Credit Score:** Your score (${credit}) is below the standard 700 threshold. Banks associate this with higher default risk.\n`;
      }
      if (salary < 30000) {
        analysis += `⚠️ **Key Concern — Income:** A minimum disposable salary of ₹30,000 ensures you can service EMIs after meeting essential living expenses.\n`;
      }
      if (emi > 20000) {
        analysis += `⚠️ **High Debt Obligations:** You are already servicing ₹${emi.toLocaleString('en-IN')}/mo. Banks cap Fixed Obligation to Income Ratio (FOIR) at 40%-50%.\n`;
      }

      analysis += `\n**💡 Recommended Action Plan:**\n`;
      analysis += `1. Add a creditworthy co-applicant (spouse/family) to boost total verified income.\n`;
      analysis += `2. Prepay small unsecured loans to bring existing obligations below ₹15,000/mo.\n`;
      analysis += `3. Wait 90-120 days while making 100% on-time payments to lift your credit score by 25-50 points.`;

      return { reply: analysis, timestamp: new Date().toISOString() };
    }

    // Topic 1: Credit Score Improvement
    if (q.includes('credit score') || q.includes('cibil') || q.includes('raise score') || q.includes('boost score')) {
      return {
        reply: `### 📈 How to Boost Your Credit Score Fast (300 to 900 Scale)

Improving your credit score requires disciplined financial habits. Here is a proven roadmap:

1. **Maintain Credit Utilization Below 30%**
   * If your credit limit across cards is ₹1,00,000, keep total outstanding balances below ₹30,000 before the statement generation date.
2. **Never Miss or Delay an EMI / Card Payment**
   * Payment history carries the largest weight (~35%). Enable auto-debit for total amount due.
3. **Avoid Multiple Hard Inquiries in Short Periods**
   * Do not apply to 4-5 banks at once. Each loan application triggers a "Hard Pull" that shaves 5-15 points off your score.
4. **Preserve Older Credit Accounts**
   * Average age of credit accounts accounts for 15% of your score. Keep your oldest no-annual-fee credit card active.
5. **Rectify Errors on Credit Reports**
   * Download your free annual credit report from CIBIL, Experian, or Equifax and dispute any outdated or erroneous defaults.`,
        timestamp: new Date().toISOString()
      };
    }

    // Topic 2: EMI Calculation & Reduction
    if (q.includes('emi') || q.includes('interest rate') || q.includes('reduce emi') || q.includes('tenure')) {
      return {
        reply: `### 💰 Understanding EMI & Strategies to Reduce It

**EMI Formula:**
$$\\text{EMI} = P \\times R \\times \\frac{(1+R)^N}{(1+R)^N - 1}$$
Where $P$ is Principal, $R$ is Monthly Interest Rate, and $N$ is Tenure in months.

**Ways to Lower Your Monthly EMI:**
1. **Extend Loan Tenure:** Increasing tenure from 3 to 5 years drops monthly payments, though total interest over the life of the loan increases.
2. **Make Lump-Sum Part-Prepayments:** Prepaying 10-15% of the principal when you receive annual bonuses significantly reduces the outstanding base.
3. **Balance Transfer:** Refinance high-cost personal loans (14-18%) to a lower interest balance transfer facility (10.5-12%).
4. **Opt for Step-Down or Step-Up Structures:** If available, match payment schedules with your projected salary increments.`,
        timestamp: new Date().toISOString()
      };
    }

    // Topic 3: Loan Eligibility Rules & Documents
    if (q.includes('documents') || q.includes('eligibility criteria') || q.includes('qualify') || q.includes('requirements')) {
      return {
        reply: `### 📋 Essential Criteria & Documents for Loan Approval

**Standard BFSI Benchmarks:**
* **Age:** 21 to 60 (salaried) or 65 (self-employed).
* **Net Monthly Income:** Minimum ₹30,000 per month (higher for metropolitan cities).
* **Credit Score:** 720+ preferred; scores above 780 qualify for prime promotional interest rates.
* **Work Experience:** Minimum 1-2 years total experience, with at least 6 months at current employer.

**Required Documentation Checklist:**
* **Identity & Address Proof:** PAN Card, Aadhaar Card, Passport, or Voter ID.
* **Income Proof (Salaried):** Last 3 months' salary slips, Form 16, and 6 months of bank account statements showing salary credits.
* **Income Proof (Self-Employed):** Last 2 years' ITR with computation, audited P&L, balance sheets, and 6-12 months bank statements.`,
        timestamp: new Date().toISOString()
      };
    }

    // Default intelligent BFSI response
    return {
      reply: `### 🤖 FINAI Financial Guidance

Thank you for your question. Here are key financial fundamentals to consider:

* **Debt-to-Income / FOIR:** Lending institutions generally ensure that your combined monthly debt repayments do not exceed **40% to 50%** of your net monthly income.
* **Indicative Borrowing Limit:** For personal and unsecured loans, maximum borrowing capacity is typically **15× to 25× your net monthly salary**, conditioned upon a CIBIL score of 720+.
* **Emergency Buffer:** Always keep at least 3 to 6 months of living expenses and EMIs in a liquid savings or fixed deposit before taking on new long-term financial liabilities.

Feel free to ask me about:
- *“How do I increase my eligible loan amount?”*
- *“What is the difference between flat interest and reducing balance EMI?”*
- *“How does credit utilization affect my loan approval chances?”*`,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new AiService();
