// ---------------- Theme colors for each character ----------------
const roleThemeMap = {
  "teacher": {
    bg: "linear-gradient(135deg, #a8edea, #fed6e3)",
    bubble: "rgba(173, 216, 230, 0.4)",
    input: "rgba(173, 216, 230, 0.2)"
  },
  "mental-doctor": {
    bg: "linear-gradient(135deg, #cfd9df, #e2ebf0)",
    bubble: "rgba(135, 206, 250, 0.4)",
    input: "rgba(135, 206, 250, 0.2)"
  },
  "stress-reliever": {
    bg: "linear-gradient(135deg, #fceabb, #f8b500)",
    bubble: "rgba(255, 223, 0, 0.3)",
    input: "rgba(255, 223, 0, 0.2)"
  },
  "girl-knowledge": {
    bg: "linear-gradient(135deg, #ff9a9e, #fecfef)",
    bubble: "rgba(255, 105, 180, 0.4)",
    input: "rgba(255, 105, 180, 0.2)"
  },
  "GPT": {
    bg: "linear-gradient(135deg, #d4fc79, #96e6a1)",
    bubble: "rgba(144, 238, 144, 0.4)",
    input: "rgba(144, 238, 144, 0.2)"
  }
};

// ---------------- Role → persona mapping ----------------
const rolePersonaMap = {
  "teacher": "assistant",
  "mental-doctor": "coach",
  "stress-reliever": "coach",
  "girl-knowledge": "companion",
  "GPT": "companion"
};

// ---------------- DOMContentLoaded ----------------
document.addEventListener("DOMContentLoaded", () => {
  // ---------------- Elements ----------------
  const characterSelect = document.getElementById("characterSelect");
  const chatUI = document.querySelector("main");
  const sidebar = document.querySelector(".sidebar");
  const topbar = document.querySelector(".topbar");
  const chat = document.getElementById('chat');
  const input = document.getElementById('msg');
  const sendBtn = document.getElementById('send');
  const personaQuick = document.getElementById('personaSelect');
  const historyList = document.getElementById('historyList');
  const newChatBtn = document.getElementById('newChat');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const closeSidebar = document.getElementById('closeSidebar');
  const overlay = document.getElementById('overlay');
  const loginDemoBtn = document.getElementById('loginDemo');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');

  // Gemini config
  const API_KEY = "AIzaSyAwNCNsKv4u7eDdugGhxsUE9KA_8BaOrgo"; // replace with your key
  const MODEL = "gemini-2.5-pro";

  // ---------------- State ----------------
  let currentChatId = null;
  let persona = localStorage.getItem('persona') || 'companion';
  let currentBubbleColor = null;

  // ---------------- Hide chat initially ----------------
  chatUI.style.display = "none";
  sidebar.style.display = "none";
  topbar.style.display = "none";

  // ---------------- Character selection ----------------
  document.querySelectorAll(".character").forEach(char => {
    char.addEventListener("click", () => {
      const role = char.dataset.role;
      console.log("Selected:", role);

      // Hide selection, show chat UI
      characterSelect.style.display = "none";
      chatUI.style.display = "block";
      sidebar.style.display = "block";
      topbar.style.display = "flex";

      // Set persona
      persona = rolePersonaMap[role] || "companion";
      personaQuick.value = persona;
      localStorage.setItem('persona', persona);

      // Apply theme
      const theme = roleThemeMap[role];
      if(theme){
        document.body.style.background = theme.bg;
        document.getElementById('inputbar').style.background = theme.input;
        currentBubbleColor = theme.bubble;

        // update existing bot messages
        document.querySelectorAll('.msg.bot').forEach(m => {
          m.style.background = currentBubbleColor;
        });
      }

      // Seed welcome message
      seedWelcome();
    });
  });

  // ---------------- Persona UI sync ----------------
  personaQuick.value = persona;
  document.querySelectorAll('input[name="personaRadio"]').forEach(r => {
    r.checked = (r.value === persona);
    r.addEventListener('change', e => {
      persona = e.target.value;
      personaQuick.value = persona;
      localStorage.setItem('persona', persona);
      addMessage(`Switched to ${persona} mode.`, 'bot');
    });
  });
  personaQuick.addEventListener('change', e => {
    persona = e.target.value;
    localStorage.setItem('persona', persona);
    document.querySelectorAll('input[name="personaRadio"]').forEach(r => r.checked = (r.value === persona));
    addMessage(`Switched to ${persona} mode.`, 'bot');
  });

  // ---------------- Sidebar controls ----------------
  function openSidebar() { sidebar.classList.add('open'); document.body.classList.add('sidebar-open'); overlay.classList.add('active'); sidebarToggle.classList.add('active'); }
  function closeSidebarFn() { sidebar.classList.remove('open'); document.body.classList.remove('sidebar-open'); overlay.classList.remove('active'); sidebarToggle.classList.remove('active'); }
  function toggleSidebar() { sidebar.classList.contains('open') ? closeSidebarFn() : openSidebar(); }
  sidebarToggle.addEventListener('click', toggleSidebar);
  closeSidebar.addEventListener('click', closeSidebarFn);
  overlay.addEventListener('click', closeSidebarFn);

  // ---------------- Demo login ----------------
  loginDemoBtn.addEventListener('click', () => {
    userName.textContent = 'Samantha';
    userEmail.textContent = 'sam@demo.ai';
  });

  // ---------------- Chat history ----------------
  function loadHistory() {
    const all = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    historyList.innerHTML = '';
    Object.keys(all).sort((a,b) => all[b].updated - all[a].updated).forEach(id => {
      const li = document.createElement('li');
      li.textContent = all[id].title || 'Untitled chat';
      li.addEventListener('click', () => openChat(id));
      historyList.appendChild(li);
    });
    return all;
  }

  function createChat() {
    const id = 'c_' + Date.now();
    const all = loadHistory();
    all[id] = { title: 'New chat', messages: [], updated: Date.now(), persona };
    localStorage.setItem('chatHistory', JSON.stringify(all));
    currentChatId = id;
    chat.innerHTML = '';
    seedWelcome();
    loadHistory();
  }

  function openChat(id) {
    const all = loadHistory();
    const data = all[id];
    if (!data) return;
    currentChatId = id;
    chat.innerHTML = '';
    data.messages.forEach(m => addMessage(m.text, m.role, false));
    scrollBottom();
  }

  function saveMessage(text, role) {
    const all = loadHistory();
    if (!currentChatId) { createChat(); }
    const data = all[currentChatId];
    data.messages.push({ text, role, ts: Date.now() });
    if (!data.title && role === 'user') data.title = text.slice(0, 28) + (text.length > 28 ? '…' : '');
    data.updated = Date.now();
    all[currentChatId] = data;
    localStorage.setItem('chatHistory', JSON.stringify(all));
    loadHistory();
  }

  // ---------------- Message helpers ----------------
  function addMessage(text, who='bot', save=true) {
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    div.textContent = text;
    if(who === 'bot' && currentBubbleColor) div.style.background = currentBubbleColor;
    chat.appendChild(div);
    if (save) saveMessage(text, who);
    scrollBottom();
  }

  function addTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'msg bot';
    if(currentBubbleColor) wrap.style.background = currentBubbleColor;
    const dots = document.createElement('span');
    dots.className = 'typing';
    dots.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    wrap.appendChild(dots);
    chat.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function scrollBottom() { chat.scrollTop = chat.scrollHeight; }

  function seedWelcome() {
    const textMap = {
      companion: "Hi! I’m your friendly companion 💖 How are you feeling today?",
      coach: "Hey! I’m your wellness coach 🧘 Ready for a quick check-in?",
      assistant: "Hi! I’m your task assistant 📋 What can I help you get done?"
    };
    addMessage(textMap[persona] || textMap.companion, 'bot', false);
  }

  // ---------------- Gemini API ----------------
  function buildGeminiPayload(userText, personaMode) {
    const personaPrompts = {
      companion: `You are a warm, empathetic mental health companion. Respond kindly and supportively. Avoid medical diagnosis. Offer coping tips when appropriate. Keep responses calm and concise (<150 words).`,
      coach: `You are a wellness coach. Provide short practical actions, quick exercises, motivational tone. Keep responses actionable and concise.`,
      assistant: `You are a task assistant. Be concise and action-oriented. Respond clearly with next steps.`
    };
    const systemPrompt = personaPrompts[personaMode] || personaPrompts['companion'];
    const text = systemPrompt + "\n\nUser: " + userText;
    return { generationConfig: { maxOutputTokens: 500, temperature: 0.2, topP: 0.95 }, contents: [{ role: "user", parts: [{ text }] }] };
  }

  async function callGemini(userText, personaMode) {
    if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY") throw new Error("Set YOUR_GEMINI_API_KEY before using Gemini.");
    const payload = buildGeminiPayload(userText, personaMode);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const res = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    if (!res.ok) {
      let errText = `${res.status} ${res.statusText}`;
      try { const errJson = await res.json(); errText = errJson.error?.message || JSON.stringify(errJson); } catch(e){}
      throw new Error(`Gemini API error: ${errText}`);
    }
    const data = await res.json();
    const candidate = data?.candidates?.[0];
    let reply = candidate?.content?.parts?.[0]?.text || "";
    if (candidate?.finishReason === "MAX_TOKENS") reply += "\n\n⚠️ Response truncated. Try asking for a shorter reply.";
    return reply || "⚠️ No reply from Gemini.";
  }

  async function sendMessage() {
    const textVal = (input.value || '').trim();
    if (!textVal) return;
    addMessage(textVal, 'user');
    input.value = '';
    const typingEl = addTyping();
    sendBtn.disabled = true; input.disabled = true;
    try {
      const reply = await callGemini(textVal, persona);
      typingEl.remove();
      addMessage(reply, 'bot');
    } catch (err) {
      console.error('Gemini error:', err);
      typingEl.remove();
      addMessage("❌ Error contacting Gemini API. Open console for details.", 'bot');
    } finally {
      sendBtn.disabled = false; input.disabled = false; scrollBottom();
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
  newChatBtn.addEventListener('click', createChat);

  // ---------------- Init ----------------
  loadHistory();
  createChat();
});
