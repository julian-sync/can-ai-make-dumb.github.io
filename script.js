// ─── Configuration ────────────────────────────────────────────────────────────
const OPENROUTER_API_KEY = "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";

// OpenRouter Model
const MODEL = "google/gemma-4-31b-it:free";

// Path to the API promt
const SEND_TO_AI_FILE = "SendToAI.txt";

// Sidebar quick-prompt buttons
const SIDEBAR_ITEMS = [
  { label: "What's AI?",               prompt: "What's AI?"                              },
  { label: "What can AI be used for?", prompt: "What can AI be used for?"                },
  { label: "Can AI make you dumb?",    prompt: "Can AI make you dumb?",    active: true  },
  { label: "What are AI hallucinations?", prompt: "What are AI hallucinations?"          },
  { label: "Why do AI systems have restrictions?", prompt: "Why do AI systems have restrictions?" },
  { label: "AI in School and Homework",prompt: "AI in School and Homework"               },
  { label: "Does AI know what it is doing?", prompt: "Does AI know what it is doing?"   },
  { label: "Conclusion",               prompt: "Give me a conclusion about AI.",
    sub: "Conclusion = Fazit",          active: true                                     },
];

// ─── DOM References ────────────────────────────────────────────────────────────
const chatBox   = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn   = document.getElementById("sendBtn");
const sidebar   = document.getElementById("sidebar");

// ─── Sidebar Buttons ───────────────────────────────────────────────────────────
SIDEBAR_ITEMS.forEach(item => {
  const btn = document.createElement("button");
  btn.className = "sidebar-btn" + (item.active ? " active" : "");
  btn.textContent = item.label;

  if (item.sub) {
    const sub = document.createElement("span");
    sub.className = "sub-label";
    sub.textContent = item.sub;
    btn.appendChild(sub);
  }

  btn.addEventListener("click", () => {
    userInput.value = item.prompt;
    userInput.focus();
  });

  sidebar.appendChild(btn);
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function buildAvatar() {
  const avatar = document.createElement("div");
  avatar.className = "ai-avatar";
  const dots = document.createElement("div");
  dots.className = "ai-avatar-dots";
  for (let i = 0; i < 3; i++) {
    dots.appendChild(document.createElement("span"));
  }
  avatar.appendChild(dots);
  return avatar;
}

function appendUserMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row user";
  const bubble = document.createElement("div");
  bubble.className = "bubble-user";
  bubble.textContent = text;
  row.appendChild(bubble);
  chatBox.appendChild(row);
  scrollToBottom();
}

function appendThinking() {
  const row = document.createElement("div");
  row.className = "message-row ai thinking-row";
  const avatar = buildAvatar();
  avatar.querySelectorAll(".ai-avatar-dots span").forEach(d => {
    d.style.animation = "blink 1.2s infinite";
  });
  const label = document.createElement("span");
  label.className = "thinking-label";
  label.textContent = "Thinking...";
  row.appendChild(avatar);
  row.appendChild(label);
  chatBox.appendChild(row);
  scrollToBottom();
  return row;
}

function replaceThinkingWithAnswer(thinkingRow, text) {
  const row = document.createElement("div");
  row.className = "message-row ai";
  const avatar = buildAvatar();
  const bubble = document.createElement("div");
  bubble.className = "bubble-ai";
  bubble.textContent = text;
  row.appendChild(avatar);
  row.appendChild(bubble);
  chatBox.replaceChild(row, thinkingRow);
  scrollToBottom();
}

function showError(thinkingRow, message) {
  replaceThinkingWithAnswer(thinkingRow, "⚠️ " + message);
}

// ─── Load SendToAI.txt context ─────────────────────────────────────────────────
let systemContext = "";

async function loadContext() {
  if (!SEND_TO_AI_FILE) return;
  try {
    const res = await fetch(SEND_TO_AI_FILE);
    if (res.ok) {
      systemContext = await res.text();
    } else {
      console.warn("SendToAI.txt not found. Proceeding without context.");
    }
  } catch (e) {
    console.warn("SendToAI.txt could not be loaded:", e);
  }
}

// ─── OpenRouter API Call ───────────────────────────────────────────────────────
async function sendToAI(userMessage) {
  const messages = [];

  if (systemContext) {
    messages.push({ role: "system", content: systemContext.trim() });
  }

  messages.push({ role: "user", content: userMessage });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + OPENROUTER_API_KEY,
      "HTTP-Referer": window.location.href,
      "X-Title": "TestAI"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData && errData.error && errData.error.message
      ? errData.error.message
      : "HTTP " + response.status;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data && data.choices && data.choices[0] &&
               data.choices[0].message && data.choices[0].message.content;
  if (!text) throw new Error("Empty response from model.");
  return text;
}

// ─── Send Handler ──────────────────────────────────────────────────────────────
async function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = "";
  userInput.disabled = true;
  sendBtn.disabled = true;

  appendUserMessage(text);
  const thinkingRow = appendThinking();

  try {
    const answer = await sendToAI(text);
    replaceThinkingWithAnswer(thinkingRow, answer);
  } catch (err) {
    showError(thinkingRow, "Error: " + err.message);
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
}

// ─── Event Listeners ───────────────────────────────────────────────────────────
sendBtn.addEventListener("click", handleSend);

userInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// ─── Init ──────────────────────────────────────────────────────────────────────
loadContext();
