/**
 * FINAI — Module 4: Anthropic Claude AI Financial Assistant Controller
 */

let chatHistory = [];

document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const clearBtn = document.getElementById('btn-clear-chat');

  // Load chat history from localStorage
  loadChatHistory();

  // Setup Suggested Prompt Chips
  setupSuggestedChips();

  // Check Claude AI API status
  checkAiStatus();

  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;

      chatInput.value = '';
      await sendChatMessage(message);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear entire conversation history?')) {
        chatHistory = [];
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CHAT_HISTORY);
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
          appendWelcomeMessage();
        }
        showToast('Chat history cleared.', 'info');
      }
    });
  }
});

async function checkAiStatus() {
  try {
    const res = await apiRequest(CONFIG.ENDPOINTS.AI_STATUS);
    const badge = document.getElementById('ai-engine-badge');
    if (badge && res.data) {
      if (res.data.isAiConfigured || res.data.isClaudeConfigured) {
        badge.textContent = `${res.data.model} Live`;
        badge.className = 'badge badge-success';
      } else {
        badge.textContent = 'BFSI Expert Engine (Local)';
        badge.className = 'badge badge-neutral';
        badge.title = 'Add a free GEMINI_API_KEY or GROQ_API_KEY in .env to activate live cloud AI';
      }
    }
  } catch (e) {
    console.warn('AI status check notice:', e.message);
  }
}

function setupSuggestedChips() {
  const chips = document.querySelectorAll('.suggested-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt') || chip.textContent.trim();
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = prompt;
        input.focus();
      }
      sendChatMessage(prompt);
    });
  });
}

function loadChatHistory() {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.CHAT_HISTORY);
  if (saved) {
    try {
      chatHistory = JSON.parse(saved);
      const messagesContainer = document.getElementById('chat-messages');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
        chatHistory.forEach(msg => {
          renderMessageBubble(msg.role, msg.content, msg.timestamp, false);
        });
        scrollChatToBottom();
      }
      return;
    } catch (e) {
      console.warn('Error reading saved chat:', e);
    }
  }

  appendWelcomeMessage();
}

function appendWelcomeMessage() {
  const welcomeText = `👋 **Hello! I am FINAI, your dedicated AI Financial & Lending Assistant.**

I'm here to help you evaluate loans, understand credit factors, calculate EMIs, and build a stronger financial profile.

**You can ask me questions like:**
* *“How can I increase my eligible loan amount from ₹15 Lakhs to ₹25 Lakhs?”*
* *“What is Fixed Obligation to Income Ratio (FOIR) and why do banks care?”*
* *“Explain the exact difference between flat rate vs reducing balance interest.”*
* *“How do late credit card payments impact my CIBIL score?”*

What would you like to explore today?`;

  renderMessageBubble('assistant', welcomeText, new Date().toISOString(), false);
}

async function sendChatMessage(userText) {
  const now = new Date().toISOString();

  // 1. Render User Message
  renderMessageBubble('user', userText, now, true);
  chatHistory.push({ role: 'user', content: userText, timestamp: now });
  scrollChatToBottom();

  // 2. Show Typing Indicator
  showTypingIndicator();

  // 3. Retrieve user context from localStorage if available
  let context = {};
  const lastCheck = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_ELIGIBILITY);
  if (lastCheck) {
    try {
      context = JSON.parse(lastCheck);
    } catch (e) {}
  }

  try {
    const res = await apiRequest(CONFIG.ENDPOINTS.AI_CHAT, {
      method: 'POST',
      body: JSON.stringify({
        message: userText,
        history: chatHistory.slice(-8), // Send recent messages for conversational context
        context: context
      })
    });

    hideTypingIndicator();

    const reply = res.data.reply;
    const replyTime = res.data.timestamp || new Date().toISOString();

    renderMessageBubble('assistant', reply, replyTime, true);
    chatHistory.push({ role: 'assistant', content: reply, timestamp: replyTime });

    // Persist to storage
    localStorage.setItem(CONFIG.STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(chatHistory));
    scrollChatToBottom();
  } catch (err) {
    hideTypingIndicator();
    const errorMsg = `⚠️ **Assistant Notice:** ${err.message || 'Unable to communicate with AI service at this time. Please try again.'}`;
    renderMessageBubble('assistant', errorMsg, new Date().toISOString(), true);
    scrollChatToBottom();
  }
}

function renderMessageBubble(role, rawContent, timestamp, animate = true) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${role} ${animate ? 'animate-fade-in' : ''}`;

  const avatarContent = role === 'user'
    ? '<i data-lucide="user"></i>'
    : '<i data-lucide="bot"></i>';

  const timeFormatted = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const parsedHtml = parseMarkdownToHtml(rawContent);

  msgDiv.innerHTML = `
    <div class="message-avatar">
      ${avatarContent}
    </div>
    <div style="display:flex;flex-direction:column;max-width:100%;">
      <div class="message-bubble">
        ${parsedHtml}
      </div>
      <div class="message-timestamp">${timeFormatted}</div>
    </div>
  `;

  container.appendChild(msgDiv);
  if (window.lucide) lucide.createIcons();
}

function showTypingIndicator() {
  hideTypingIndicator();
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const typingDiv = document.createElement('div');
  typingDiv.id = 'chat-typing-indicator';
  typingDiv.className = 'chat-message assistant animate-fade-in';
  typingDiv.innerHTML = `
    <div class="message-avatar"><i data-lucide="bot"></i></div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;

  container.appendChild(typingDiv);
  if (window.lucide) lucide.createIcons();
  scrollChatToBottom();
}

function hideTypingIndicator() {
  const el = document.getElementById('chat-typing-indicator');
  if (el) el.remove();
}

function scrollChatToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// Lightweight Markdown to HTML parser for formatted responses
function parseMarkdownToHtml(md) {
  if (!md) return '';

  let html = md
    // Escape standard HTML tags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gim, '<h3 style="font-size:1.05rem;font-weight:700;margin:0.5rem 0 0.3rem;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size:1.15rem;font-weight:700;margin:0.6rem 0 0.4rem;">$1</h2>')
    // Bold & Italics
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Math formulas: $$...$$ or $...$
    .replace(/\$\$(.*?)\$\$/gim, '<div class="font-mono" style="padding:0.4rem 0.8rem;background:rgba(0,0,0,0.05);border-radius:6px;margin:0.4rem 0;">$1</div>')
    .replace(/\$(.*?)\$/gim, '<code style="font-family:var(--font-mono);">$1</code>')
    // Bullet lists
    .replace(/^\s*\*\s(.*$)/gim, '<li style="margin-left:1.25rem;list-style-type:disc;">$1</li>')
    .replace(/^\s*\d+\.\s(.*$)/gim, '<li style="margin-left:1.25rem;list-style-type:decimal;">$1</li>')
    // Line breaks
    .replace(/\n\n/gim, '<div style="height:0.5rem;"></div>')
    .replace(/\n/gim, '<br>');

  return html;
}
