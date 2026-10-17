/* =========================================================
   Phantom Black Ops Agency - script.js (CLEAN COMBINED FILE)
   - Guards index-only code from running on dossier
   - Guards dossier-only code from running on index
   - Secure Comms: chats grouped by agent, unread badges, live updates
   - Locate Agent: shares location while open, radar-scan map
   - Agent picker (no typing)
   - ONE video-call implementation with Incoming Call + Accept/Decline
   ========================================================= */

// -----------------------
// Helpers
// -----------------------
const el = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// When the page is opened by double-clicking the file, nothing that needs the server works
function serverHint(fallback) {
  return location.protocol === "file:"
    ? "This page was opened as a file, so it can't reach the server.\r\nStart the server (node server.js) and open http://localhost:3000 instead."
    : fallback;
}

const norm = (s) => String(s || "").trim().toLowerCase();

// Same agent always gets the same color, so kids can spot friends at a glance
function imfColor(name) {
  let h = 0;
  for (const ch of norm(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 70%, 45%)`;
}
function imfAvatar(name) {
  const initial = escapeHtml(String(name || "?").trim().charAt(0).toUpperCase());
  return `<span class="avatar" style="background:${imfColor(name)}">${initial}</span>`;
}

function formatDateTime(dt) {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt ?? "");
  return d.toLocaleString();
}

// -----------------------
// Detect which page we are on
// -----------------------
const IS_INDEX = !!el("start-button") && !!el("terminal-box");
const IS_DOSSIER = !!el("btn-inbox") || !!el("toggle-message-form") || !!el("send-message-form");

// =========================================================
// INDEX PAGE LOGIC (skippable intro: type, shatter, fire/smoke, login)
// =========================================================
if (IS_INDEX) {
  const typedText = el("typed-text");
  const startButton = el("start-button");
  const skipButton = el("skip-intro");
  const terminalBox = el("terminal-box");

  const fireVideo = el("fire-video");
  const smokeVideo = el("smoke-video");
  const startScreen = el("start-screen");
  const background = el("background");
  const loginContainer = el("login-container");
  const themeAudio = el("mi-audio");

  const shatterCanvas = el("shatter-canvas");
  const shatterCtx = shatterCanvas ? shatterCanvas.getContext("2d") : null;

  const text = "Hello Henry, your mission, should you choose to accept it, is ready...";
  let fragments = [];
  let typingTimer = null;
  let revealTimer = null;
  let introDone = false;
  let missionStarted = false;

  function resizeShatterCanvas() {
    if (!shatterCanvas) return;
    shatterCanvas.width = window.innerWidth;
    shatterCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeShatterCanvas);
  resizeShatterCanvas();

  // --- Step 1: type the message ---
  function showStartButton() {
    if (startButton) startButton.classList.add("is-ready");
  }

  function typeText(i = 0) {
    if (!typedText) return;
    if (i < text.length) {
      typedText.textContent += text.charAt(i);
      typingTimer = setTimeout(() => typeText(i + 1), 135);
    } else {
      typingTimer = setTimeout(showStartButton, 400);
    }
  }

  // Tapping the terminal while it types finishes the text instantly
  terminalBox?.addEventListener("click", () => {
    if (missionStarted) return;
    clearTimeout(typingTimer);
    if (typedText) typedText.textContent = text;
    showStartButton();
  });

  // --- Step 2: shatter the terminal ---
  // Draws the terminal onto a canvas ourselves (no outside library needed)
  function snapshotTerminal() {
    const r = terminalBox.getBoundingClientRect();
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(r.width));
    c.height = Math.max(1, Math.round(r.height));
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#031a03";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, c.width - 2, c.height - 2);

    const style = getComputedStyle(typedText);
    ctx.font = `${style.fontSize} ${style.fontFamily}`;
    ctx.fillStyle = "#0f0";
    ctx.textBaseline = "middle";

    // word-wrap the message the same way the box shows it
    const pad = 30;
    const maxW = c.width - pad * 2;
    const lines = [];
    let line = "";
    for (const word of (typedText.textContent || text).split(" ")) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const lh = parseFloat(style.fontSize) * 1.4;
    const top = c.height / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, pad, top + i * lh));

    return { canvas: c, rect: r };
  }

  class Fragment {
    constructor(image, x, y, dx, dy, scaleRate, rotationSpeed) {
      this.image = image;
      this.x = x;
      this.y = y;
      this.dx = dx;
      this.dy = dy;
      this.scale = 1;
      this.scaleRate = scaleRate;
      this.alpha = 1;
      this.rotation = 0;
      this.rotationSpeed = rotationSpeed;
    }
    update() {
      this.x += this.dx;
      this.y += this.dy;
      this.scale += this.scaleRate;
      this.alpha -= 0.02;
      this.rotation += this.rotationSpeed;
    }
    draw(ctx) {
      if (this.alpha <= 0) return;
      const w = this.image.width;
      const h = this.image.height;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(this.scale, this.scale);
      ctx.drawImage(this.image, -w / 2, -h / 2);
      ctx.strokeStyle = "#0f0";
      ctx.lineWidth = 1;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  function animateFragments() {
    if (!shatterCtx) return;
    shatterCtx.clearRect(0, 0, shatterCanvas.width, shatterCanvas.height);
    fragments.forEach((f) => {
      f.update();
      f.draw(shatterCtx);
    });
    fragments = fragments.filter((f) => f.alpha > 0);
    if (fragments.length > 0) requestAnimationFrame(animateFragments);
  }

  function explode({ canvas: img, rect }) {
    if (!shatterCtx) return;
    const pieceSize = 40;
    for (let y = 0; y < img.height; y += pieceSize) {
      for (let x = 0; x < img.width; x += pieceSize) {
        const pc = document.createElement("canvas");
        pc.width = pieceSize;
        pc.height = pieceSize;
        pc.getContext("2d").drawImage(img, x, y, pieceSize, pieceSize, 0, 0, pieceSize, pieceSize);

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 5;
        fragments.push(
          new Fragment(
            pc,
            rect.left + x + pieceSize / 2,
            rect.top + y + pieceSize / 2,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            0.02 + Math.random() * 0.04,
            (Math.random() - 0.5) * 0.2
          )
        );
      }
    }
    animateFragments();
  }

  // --- Step 3: fire, smoke, music, then the login fades in ---
  function playVideo(v) {
    if (!v) return;
    v.classList.add("is-playing");
    v.currentTime = 0;
    v.play().catch(() => {});
    v.onended = () => v.classList.remove("is-playing");
  }

  function revealLogin(instant = false) {
    if (introDone) return;
    introDone = true;
    document.body.classList.add("intro-finished");
    if (instant) document.body.classList.add("intro-skipped");
    startScreen?.classList.add("is-gone");
    background?.classList.add("is-visible");
    loginContainer?.classList.add("is-visible");
    skipButton?.classList.add("is-gone");
  }

  function startMission() {
    if (missionStarted || !terminalBox) return;
    missionStarted = true;
    clearTimeout(typingTimer);
    if (typedText) typedText.textContent = text;

    const snap = snapshotTerminal();
    terminalBox.style.visibility = "hidden";
    if (startButton) startButton.style.visibility = "hidden";
    startScreen?.classList.add("is-clear");
    explode(snap);

    setTimeout(() => {
      playVideo(fireVideo);
      playVideo(smokeVideo);
      themeAudio?.play?.().catch(() => {});
    }, 150);

    revealTimer = setTimeout(() => revealLogin(false), 3000);
  }

  function skipIntro() {
    clearTimeout(typingTimer);
    clearTimeout(revealTimer);
    fragments = [];
    shatterCtx?.clearRect(0, 0, shatterCanvas.width, shatterCanvas.height);
    [fireVideo, smokeVideo].forEach((v) => {
      if (!v) return;
      v.pause();
      v.classList.remove("is-playing");
    });
    revealLogin(true);
  }

  startButton?.addEventListener("click", startMission);
  skipButton?.addEventListener("click", skipIntro);
  document.addEventListener("keydown", (e) => {
    if (introDone) return;
    if (e.key === "Escape") skipIntro();
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (startButton?.classList.contains("is-ready")) startMission();
      else terminalBox?.click();
    }
  });

  typeText();

  // Back/forward button: Chrome restores the finished page from memory.
  // Reload instead so the cinematic plays again.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) location.reload();
  });

  // =====================================================
  // LOGIN: tap your face -> 4-digit PIN (Director: password)
  // =====================================================
  const KNOWN_KEY = "imf_known_agents";
  const knownAgents = () => { try { return JSON.parse(localStorage.getItem(KNOWN_KEY)) || []; } catch { return []; } };
  function rememberAgent(name) {
    const list = [name, ...knownAgents().filter((n) => norm(n) !== norm(name))].slice(0, 8);
    try { localStorage.setItem(KNOWN_KEY, JSON.stringify(list)); } catch {}
  }

  const steps = ["login-welcome", "login-pick", "login-name", "login-pin", "login-password", "login-signup"];
  let stepHistory = [];
  function showStep(id, { push = true } = {}) {
    const current = steps.find((s) => !el(s).hidden);
    if (push && current && current !== id) stepHistory.push(current);
    steps.forEach((s) => (el(s).hidden = s !== id));
    el("create-agent-toggle").hidden = !["login-pick", "login-name"].includes(id);
    if (id === "login-name") setTimeout(() => el("login-agent-name").focus(), 50);
    if (id === "login-password") setTimeout(() => el("login-password-input").focus(), 50);
  }
  function goBack() {
    const prev = stepHistory.pop();
    showStep(prev || "login-pick", { push: false });
  }
  document.querySelectorAll("#login-container [data-back]").forEach((b) => b.addEventListener("click", goBack));

  let loginName = "";   // who is logging in right now
  let pinMode = "login"; // "login" | "new" | "confirm"
  let firstNewPin = "";

  function renderTiles() {
    const tiles = knownAgents().map((n) => `
      <button class="agent-tile" type="button" data-agent="${escapeHtml(n)}">
        ${imfAvatar(n)}<span>${escapeHtml(n)}</span>
      </button>`).join("");
    el("agent-tiles").innerHTML = tiles + `
      <button class="agent-tile other" type="button" data-other>
        <span class="avatar avatar-other">＋</span><span>${knownAgents().length ? "Other agent" : "Log in"}</span>
      </button>`;
  }
  el("agent-tiles").addEventListener("click", (e) => {
    const t = e.target.closest(".agent-tile");
    if (!t) return;
    if (t.hasAttribute("data-other")) {
      el("login-agent-name").value = "";
      showStep("login-name");
    } else {
      beginLogin(t.dataset.agent);
    }
  });

  async function post(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.success !== false, status: res.status, data };
  }

  async function beginLogin(name) {
    name = String(name || "").trim();
    if (!name) return;
    try {
      const { data } = await post("/api/login/start", { agent_name: name });
      loginName = data.agent_name || name;
      if (data.method === "password" || data.method === "legacy") {
        el("pw-avatar").innerHTML = imfAvatar(loginName);
        el("pw-name").textContent = loginName;
        el("pw-prompt").textContent = data.method === "legacy"
          ? "FIRST TIME WITH PINS: ENTER YOUR OLD PASSWORD ONCE"
          : "DIRECTOR PASSWORD";
        el("pw-error").textContent = "";
        el("login-password-input").value = "";
        showStep("login-password");
      } else {
        startPin("login");
      }
    } catch {
      alert(serverHint("Can't reach headquarters. Is the server running?"));
    }
  }
  el("btn-name-next").addEventListener("click", () => beginLogin(el("login-agent-name").value));
  el("login-agent-name").addEventListener("keydown", (e) => { if (e.key === "Enter") beginLogin(el("login-agent-name").value); });

  // ---- Number pad ----
  let pinEntry = "";
  const pad = el("pin-pad");
  pad.innerHTML = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k) =>
    k ? `<button class="pin-key ${k === "⌫" ? "pin-del" : ""}" type="button" data-key="${k}">${k}</button>` : `<span></span>`).join("");

  function drawDots(state = "") {
    el("pin-dots").className = `pin-dots ${state}`;
    [...el("pin-dots").children].forEach((d, i) => d.classList.toggle("on", i < pinEntry.length));
  }
  function startPin(mode) {
    pinMode = mode;
    pinEntry = "";
    el("pin-avatar").innerHTML = imfAvatar(loginName);
    el("pin-name").textContent = loginName;
    el("pin-prompt").textContent = { login: "ENTER YOUR PIN", new: "CHOOSE A SECRET 4-NUMBER PIN", confirm: "TYPE YOUR NEW PIN AGAIN" }[mode];
    el("pin-error").textContent = "";
    drawDots();
    showStep("login-pin", { push: mode === "login" });
  }
  function pressKey(k) {
    if (k === "⌫") pinEntry = pinEntry.slice(0, -1);
    else if (pinEntry.length < 4) pinEntry += k;
    el("pin-error").textContent = "";
    drawDots();
    if (pinEntry.length === 4) setTimeout(() => pinComplete(pinEntry), 120);
  }
  pad.addEventListener("click", (e) => {
    const k = e.target.closest(".pin-key")?.dataset.key;
    if (k) pressKey(k);
  });
  document.addEventListener("keydown", (e) => {
    if (el("login-pin").hidden) return;
    if (/^\d$/.test(e.key)) pressKey(e.key);
    else if (e.key === "Backspace") pressKey("⌫");
  });
  function pinError(msg) {
    el("pin-error").textContent = msg;
    pinEntry = "";
    drawDots("shake");
  }

  async function pinComplete(pin) {
    if (pinMode === "login") {
      const r = await post("/api/login", { agent_name: loginName, pin });
      if (r.ok) return loggedIn(r.data);
      return pinError(r.data.message || "Wrong PIN");
    }
    if (pinMode === "new") {
      firstNewPin = pin;
      return startPin("confirm");
    }
    if (pinMode === "confirm") {
      if (pin !== firstNewPin) {
        startPin("new");
        return pinError("Those didn't match. Try again!");
      }
      const r = await post("/api/me/pin", { pin });
      if (!r.ok) return pinError(r.data.message || "Couldn't save PIN");
      drawDots("good");
      setTimeout(enterHQ, 500);
    }
  }

  // ---- Password (Director / old account) ----
  el("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = el("login-password-input").value;
    if (!password) return;
    try {
      const r = await post("/api/login", { agent_name: loginName, password });
      if (!r.ok) {
        el("pw-error").textContent = r.data.message || "Login failed";
        return;
      }
      loggedIn(r.data);
    } catch {
      el("pw-error").textContent = serverHint("Can't reach headquarters.");
    }
  });

  function loggedIn(data) {
    loginName = data.agent?.agent_name || loginName;
    rememberAgent(loginName);
    sessionStorage.setItem("agent_name", loginName);
    if (data.needsPin) {
      startPin("new"); // old account: pick a PIN now
      return;
    }
    drawDots("good");
    setTimeout(enterHQ, 300);
  }
  function enterHQ() {
    window.location.href = "dossier.html";
  }

  // ---- Already logged in? ----
  el("btn-enter-hq").addEventListener("click", enterHQ);
  el("btn-switch-agent").addEventListener("click", async () => {
    try { await post("/api/logout"); } catch {}
    sessionStorage.removeItem("agent_name");
    renderTiles();
    stepHistory = [];
    showStep("login-pick", { push: false });
  });

  // ---- Request to join ----
  el("create-agent-toggle").addEventListener("click", () => {
    el("signup-msg").textContent = "";
    showStep("login-signup");
  });
  el("register-agent").addEventListener("click", async () => {
    const msg = el("signup-msg");
    const agent_name = el("agent-name").value.trim();
    const pin = el("agent-pin").value.trim();
    const pin2 = el("agent-pin2").value.trim();
    if (!agent_name) return (msg.textContent = "Pick a code name");
    if (!/^\d{4}$/.test(pin)) return (msg.textContent = "PIN must be exactly 4 numbers");
    if (pin !== pin2) return (msg.textContent = "The two PINs don't match");
    try {
      const r = await post("/api/register", {
        agent_name, pin, email: el("agent-email").value.trim(), bio: el("agent-bio").value.trim(),
      });
      msg.textContent = r.data.message || (r.ok ? "Request sent!" : "Couldn't send request");
      msg.classList.toggle("is-good", r.ok);
      if (r.ok) {
        rememberAgent(agent_name);
        ["agent-name", "agent-pin", "agent-pin2", "agent-email", "agent-bio"].forEach((id) => (el(id).value = ""));
      }
    } catch {
      msg.textContent = serverHint("Can't reach headquarters.");
    }
  });

  // First screen after the intro
  async function setupLogin() {
    renderTiles();
    try {
      const res = await fetch("/api/me", { headers: { Accept: "application/json" } });
      if (res.ok) {
        const data = await res.json();
        const name = data.agent.agent_name;
        rememberAgent(name);
        el("welcome-avatar").innerHTML = imfAvatar(name);
        el("welcome-name").textContent = `Agent ${name}`;
        return showStep("login-welcome", { push: false });
      }
    } catch {}
    const known = knownAgents();
    showStep(known.length ? "login-pick" : "login-name", { push: false });
  }
  setupLogin();
}

// =========================================================
// DOSSIER PAGE LOGIC (send + inbox + agent picker + video call)
// =========================================================
if (IS_DOSSIER) {
  (async () => {
    // Who is logged in? The server decides (login cookie). Not logged in -> back to the start.
    let meInfo = null;
    try {
      const res = await fetch("/api/me", { headers: { Accept: "application/json" } });
      if (res.ok) meInfo = (await res.json()).agent;
    } catch {}
    if (!meInfo) {
      window.location.href = "index.html";
      return;
    }
    const me = meInfo.agent_name;
    sessionStorage.setItem("agent_name", me);
    el("agent-welcome").textContent = `Welcome, Agent ${me}`;

    // =====================================================
    // Agent Picker (no typing, touch-friendly)
    // =====================================================
    const picker = document.getElementById("agent-picker");
    const pickerClose = document.getElementById("agent-picker-close");
    const pickerList = document.getElementById("agent-picker-list");
    const pickerStatus = document.getElementById("agent-picker-status");
    const self = me;

    let onPick = null;

    function openPicker(title, callback) {
      if (!picker) return;
      onPick = callback;
      document.getElementById("agent-picker-title").textContent = title || "Select Agent";
      picker.style.display = "block";
      document.body.style.overflow = "hidden";
      loadAgents();
    }

    function closePicker() {
      if (!picker) return;
      picker.style.display = "none";
      document.body.style.overflow = "";
      onPick = null;
    }

    async function loadAgents() {
      if (!pickerStatus || !pickerList) return;

      pickerStatus.textContent = "Loading agents...";
      pickerList.innerHTML = "";

      try {
        const res = await fetch("/api/agents", { headers: { Accept: "application/json" } });
        const data = await res.json();
        const agents = (data && data.success && Array.isArray(data.agents)) ? data.agents : [];

        const filtered = agents.filter(a => String(a).trim() && String(a).trim() !== self);

        if (!filtered.length) {
          pickerStatus.textContent = self ? "No other agents available." : "You are not logged in.";
          return;
        }

        pickerStatus.textContent = "Tap an agent:";
        pickerList.innerHTML = filtered.map(name => {
          const safe = escapeHtml(name);
          return `
            <button class="agent-choice" type="button" data-agent="${safe}">
              <span>${safe}</span>
              <span style="opacity:0.8;">▶</span>
            </button>
          `;
        }).join("");

        pickerList.onclick = (e) => {
          const btn = e.target.closest(".agent-choice");
          if (!btn) return;
          const agent = btn.getAttribute("data-agent");
          if (!agent) return;

          if (typeof onPick === "function") onPick(agent);
          closePicker();
        };
      } catch (err) {
        console.error(err);
        pickerStatus.textContent = "Could not load agents (network/server issue).";
      }
    }

    pickerClose?.addEventListener("click", (e) => { e.preventDefault(); closePicker(); });
    picker?.addEventListener("click", (e) => { if (e.target === picker) closePicker(); });

    // Wire picker into Send Message
    const btnPickRecipient = document.getElementById("btn-pick-recipient");
    const recipientInput = document.getElementById("recipient-name");
    btnPickRecipient?.addEventListener("click", (e) => {
      e.preventDefault();
      openPicker("Select Recipient", (agent) => {
        if (recipientInput) recipientInput.value = agent;
      });
    });

    // =====================================================
    // SECURE COMMS: chats grouped by WHO you're talking to
    //   List view  -> one card per agent (latest message + unread badge)
    //   Thread view -> the whole back-and-forth with that agent
    // =====================================================
    const comms = el("comms");
    const listView = el("comms-list-view");
    const threadView = el("comms-thread-view");
    const commsList = el("comms-list");
    const threadTitle = el("thread-title");
    const threadMessages = el("thread-messages");
    const threadForm = el("thread-form");
    const threadInput = el("thread-input");
    const inboxBadge = el("inbox-badge");

    let openChatWith = null; // agent name of the thread on screen (or null)
    let pickTabOnLoad = false; // choose the quick-message tab when a chat first opens

    // Keep the newest message in view when the panels around the chat change size
    let stickToBottom = true;
    const scrollThreadToBottom = () => { threadMessages.scrollTop = threadMessages.scrollHeight; };
    threadMessages.addEventListener("scroll", () => {
      stickToBottom = threadMessages.scrollHeight - threadMessages.scrollTop - threadMessages.clientHeight < 40;
    });
    if (window.ResizeObserver) {
      new ResizeObserver(() => { if (stickToBottom) scrollThreadToBottom(); }).observe(threadMessages);
    }

    const api = (path, opts) =>
      fetch(path, { headers: { Accept: "application/json", "Content-Type": "application/json" }, ...opts })
        .then((r) => r.json());

    const avatar = imfAvatar;

    function shortTime(dt) {
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) return "";
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      return sameDay
        ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    function dayLabel(dt) {
      const d = new Date(dt);
      const today = new Date();
      const yesterday = new Date(Date.now() - 86400000);
      if (d.toDateString() === today.toDateString()) return "Today";
      if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
      return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
    }

    function showView(which) {
      listView.hidden = which !== "list";
      threadView.hidden = which !== "thread";
    }

    function openComms() {
      comms.hidden = false;
      document.body.style.overflow = "hidden";
    }
    function closeComms() {
      comms.hidden = true;
      openChatWith = null;
      document.body.style.overflow = "";
      refreshBadge();
    }

    // ---- List of chats ----
    async function loadConversations() {
      if (!me) return (commsList.innerHTML = `<em>Not logged in.</em>`);
      if (!commsList.children.length) commsList.innerHTML = `<em>Loading chats...</em>`;
      try {
        const data = await api("/api/conversations");
        const convos = data.conversations || [];
        setBadge(convos.reduce((n, c) => n + c.unread, 0));

        if (!convos.length) {
          commsList.innerHTML = `<div class="comms-empty">No chats yet.<br>Tap <strong>＋ New Message</strong> to contact an agent.</div>`;
          return;
        }
        commsList.innerHTML = convos.map((c) => `
          <button class="convo ${c.unread ? "has-unread" : ""}" type="button" data-agent="${escapeHtml(c.agent)}">
            ${avatar(c.agent)}
            <span class="convo-main">
              <span class="convo-top">
                <span class="convo-name">${escapeHtml(c.agent)}</span>
                <span class="convo-time">${escapeHtml(shortTime(c.lastAt))}</span>
              </span>
              <span class="convo-preview">${c.lastFromMe ? "You: " : ""}${escapeHtml(c.lastMessage)}</span>
            </span>
            ${c.unread ? `<span class="badge">${c.unread}</span>` : ""}
          </button>`).join("");
      } catch (err) {
        console.error("Conversations error:", err);
        commsList.innerHTML = `<em>${escapeHtml(serverHint("Could not load chats."))}</em>`;
      }
    }

    commsList.addEventListener("click", (e) => {
      const btn = e.target.closest(".convo");
      if (btn) openThread(btn.getAttribute("data-agent"));
    });

    // ---- One chat thread ----
    async function loadThread({ scroll = true } = {}) {
      if (!openChatWith) return;
      const other = openChatWith;
      try {
        const data = await api(`/api/thread/${encodeURIComponent(other)}`);
        if (openChatWith !== other) return; // switched chats while loading
        const msgs = data.messages || [];

        if (!msgs.length) {
          threadMessages.innerHTML = `<div class="comms-empty">No messages with ${escapeHtml(other)} yet.<br>Say hi! 👋</div>`;
        } else {
          let lastDay = "";
          threadMessages.innerHTML = msgs.map((m) => {
            const day = dayLabel(m.created_at);
            const divider = day !== lastDay ? `<div class="day-divider"><span>${escapeHtml(day)}</span></div>` : "";
            lastDay = day;
            return `${divider}
              <div class="bubble-row ${m.fromMe ? "mine" : "theirs"}">
                <div class="bubble">
                  <div class="bubble-text">${escapeHtml(m.content)}</div>
                  <div class="bubble-time">${escapeHtml(shortTime(m.created_at))}</div>
                </div>
              </div>`;
          }).join("");
        }
        if (scroll) {
          stickToBottom = true;
          scrollThreadToBottom();
        }
        if (pickTabOnLoad) {
          pickTabOnLoad = false;
          chooseTabFor(msgs);
        }

        // They've now been seen
        if (msgs.some((m) => !m.fromMe && !m.read_at)) {
          api(`/api/thread/${encodeURIComponent(other)}/read`, { method: "POST" })
            .then(refreshBadge).catch(() => {});
        }
      } catch (err) {
        console.error("Thread error:", err);
        threadMessages.innerHTML = `<em>${escapeHtml(serverHint("Could not load this chat."))}</em>`;
      }
    }

    function openThread(agent) {
      if (!agent) return;
      openChatWith = agent;
      threadTitle.innerHTML = `${avatar(agent)}<span>${escapeHtml(agent)}</span>`;
      threadMessages.innerHTML = `<em>Loading...</em>`;
      threadInput.value = "";
      hideSuggestions();
      pickTabOnLoad = true;
      openComms();
      showView("thread");
      loadThread();
    }

    async function sendInThread(e) {
      e?.preventDefault();
      const content = threadInput.value.trim();
      if (!content || !openChatWith) return;
      const sendBtn = el("thread-send");
      sendBtn.disabled = true;
      try {
        const data = await api("/api/messages", {
          method: "POST",
          body: JSON.stringify({ recipient: openChatWith, content }),
        });
        if (!data.success) throw new Error(data.message || "Send failed");
        threadInput.value = "";
        hideSuggestions();
        await loadThread();
      } catch (err) {
        console.error("Send error:", err);
        alert(serverHint("Message didn't send: " + (err.message || err)));
      } finally {
        sendBtn.disabled = false;
        if (!isTouch) threadInput.focus(); // on tablets, keep the keyboard out of the way
      }
    }

    threadForm.addEventListener("submit", sendInThread);
    // Enter sends; Shift+Enter makes a new line
    threadInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) sendInThread(e);
    });


    // =====================================================
    // QUICK MESSAGES: category tabs + big buttons that FILL the
    // reply box (then tap Send). Favorites learn what gets used.
    // The message list lives in quick-messages.js
    // =====================================================
    const QUICK = window.IMF_QUICK_MESSAGES || { starterFavorites: [], categories: [] };
    const quickPanel = el("quick-panel");
    const quickTabs = el("quick-tabs");
    const quickGrid = el("quick-grid");
    const quickSuggest = el("quick-suggest");
    const quickToggle = el("quick-toggle");
    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    // Small per-device memory (favorites + panel open/closed). Never required.
    const store = {
      get(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
      },
      set(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
      },
    };
    const countsKey = `imf_quick_counts_${norm(me)}`;
    const panelKey = "imf_quick_panel_open";

    function favorites() {
      const counts = store.get(countsKey, {});
      const used = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 12);
      const fill = (QUICK.starterFavorites || []).filter((t) => !used.includes(t));
      return [...used, ...fill].slice(0, Math.max(6, used.length));
    }
    function countUse(text) {
      const counts = store.get(countsKey, {});
      counts[text] = (counts[text] || 0) + 1;
      store.set(countsKey, counts);
    }

    const tabs = [
      { id: "fav", icon: "★", label: "Favorites", messages: null },
      ...(QUICK.categories || []),
    ];
    let currentTab = "fav";

    function renderTabs() {
      quickTabs.innerHTML = tabs.map((t) => `
        <button class="quick-tab ${t.id === currentTab ? "is-active" : ""}" type="button"
                role="tab" aria-selected="${t.id === currentTab}" data-tab="${escapeHtml(t.id)}">
          <span class="quick-tab-icon">${escapeHtml(t.icon)}</span>
          <span class="quick-tab-label">${escapeHtml(t.label)}</span>
        </button>`).join("");
    }
    function renderGrid() {
      const tab = tabs.find((t) => t.id === currentTab) || tabs[0];
      const msgs = tab.id === "fav" ? favorites() : tab.messages || [];
      quickGrid.innerHTML = msgs.map((m) =>
        `<button class="quick-msg" type="button" data-msg="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join("");
      quickGrid.scrollTop = 0;
    }
    function selectTab(id) {
      currentTab = tabs.some((t) => t.id === id) ? id : "fav";
      renderTabs();
      renderGrid();
      quickTabs.querySelector(".is-active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    // Put a quick message in the reply box (adds to anything already there)
    function fillBox(text) {
      const cur = threadInput.value.trimEnd();
      threadInput.value = cur ? `${cur} ${text}` : text;
      countUse(text);
      hideSuggestions();
      threadInput.classList.remove("just-filled");
      void threadInput.offsetWidth; // restart the flash animation
      threadInput.classList.add("just-filled");
      if (!isTouch) threadInput.focus(); // on tablets, don't pop up the keyboard
    }

    quickTabs.addEventListener("click", (e) => {
      const t = e.target.closest(".quick-tab");
      if (t) selectTab(t.dataset.tab);
    });
    quickGrid.addEventListener("click", (e) => {
      const b = e.target.closest(".quick-msg");
      if (b) fillBox(b.dataset.msg);
    });

    // Show/hide the panel (more room to read the chat)
    function setPanelOpen(open) {
      quickPanel.hidden = !open;
      quickToggle.classList.toggle("is-on", open);
      store.set(panelKey, open);
    }
    quickToggle.addEventListener("click", () => setPanelOpen(quickPanel.hidden));
    setPanelOpen(store.get(panelKey, true));

    // ---- Suggestions while typing ----
    const allQuick = [...new Set([...(QUICK.starterFavorites || []), ...(QUICK.categories || []).flatMap((c) => c.messages)])];
    const wordsOf = (m) => m.replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase(); // drop leading emoji
    function hideSuggestions() {
      quickSuggest.hidden = true;
      quickSuggest.innerHTML = "";
    }
    threadInput.addEventListener("input", () => {
      const q = threadInput.value.trim().toLowerCase();
      if (q.length < 2) return hideSuggestions();
      const scored = allQuick
        .map((m) => {
          const w = wordsOf(m);
          if (w === q) return null;
          if (w.startsWith(q)) return [0, m];
          if (w.split(/\s+/).some((x) => x.startsWith(q))) return [1, m];
          if (w.includes(q)) return [2, m];
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => a[0] - b[0])
        .slice(0, 4);
      if (!scored.length) return hideSuggestions();
      quickSuggest.innerHTML = scored.map(([, m]) =>
        `<button class="quick-suggestion" type="button" data-msg="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join("");
      quickSuggest.hidden = false;
    });
    quickSuggest.addEventListener("click", (e) => {
      const b = e.target.closest(".quick-suggestion");
      if (!b) return;
      threadInput.value = ""; // the suggestion replaces what was typed
      fillBox(b.dataset.msg);
    });

    // Called when a chat opens: if they just asked a question, show Answers first
    function chooseTabFor(msgs) {
      const last = msgs[msgs.length - 1];
      selectTab(last && !last.fromMe && /\?\s*$/.test(last.content) ? "answers" : "fav");
    }

    el("thread-back").addEventListener("click", () => {
      openChatWith = null;
      showView("list");
      loadConversations();
    });
    el("comms-close").addEventListener("click", closeComms);
    el("thread-call").addEventListener("click", () => {
      const agent = openChatWith;
      closeComms();
      window.imfPrepareCall?.(agent);
    });

    // ---- Entry points on the dossier ----
    function startNewChat() {
      openPicker("Who do you want to message?", (agent) => openThread(agent));
    }
    el("comms-new").addEventListener("click", startNewChat);
    el("toggle-message-form")?.addEventListener("click", (e) => { e.preventDefault(); startNewChat(); });
    el("btn-inbox")?.addEventListener("click", (e) => {
      e.preventDefault();
      openComms();
      showView("list");
      loadConversations();
    });

    // ---- Unread badge on the "View Inbox" button ----
    function setBadge(n) {
      if (!inboxBadge) return;
      inboxBadge.hidden = !n;
      inboxBadge.textContent = n > 9 ? "9+" : String(n);
    }
    async function refreshBadge() {
      if (!me) return;
      try {
        const data = await api("/api/conversations");
        setBadge((data.conversations || []).reduce((n, c) => n + c.unread, 0));
      } catch {}
    }
    refreshBadge();

    // ---- Live updates: the server pings us when a message arrives ----
    window.addEventListener("imf:new-message", (e) => {
      const from = e.detail?.from;
      if (openChatWith && norm(from) === norm(openChatWith)) loadThread();
      else if (!comms.hidden && !listView.hidden) loadConversations();
      else refreshBadge();
    });
    // Backup in case the live connection drops: check every 20s
    setInterval(() => {
      if (openChatWith) loadThread({ scroll: false });
      else refreshBadge();
    }, 20000);

    // =====================================================
    // LOCATE AGENT (Snapchat-style map)
    //   - While the dossier is open, this device shares its location
    //   - Locate: radar scan -> fly in to the agent's pin on a dark map
    // =====================================================
    const locateEl = el("locate");
    const locateScan = el("locate-scan");
    const scanText = el("locate-scan-text");
    const locateCard = el("locate-card");
    const locateAgents = el("locate-agents");
    const geoStatus = el("geo-status");

    const locations = new Map(); // norm(name) -> {agent_name, lat, lng, accuracy, updated_at}
    const pins = new Map();      // norm(name) -> Leaflet marker
    let map = null;
    let locateRun = 0;           // cancels an old animation if a new locate starts

    function timeAgo(dt) {
      const secs = Math.max(0, (Date.now() - new Date(dt).getTime()) / 1000);
      if (!Number.isFinite(secs)) return "unknown";
      if (secs < 60) return "just now";
      if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
      if (secs < 86400) return `${Math.floor(secs / 3600)} hr ago`;
      return new Date(dt).toLocaleDateString([], { month: "short", day: "numeric" });
    }
    const isLive = (loc) => Date.now() - new Date(loc.updated_at).getTime() < 5 * 60 * 1000;

    // ---- Share my location while the app is open ----
    let lastSent = null;
    function setGeoStatus(text, state) {
      if (!geoStatus) return;
      geoStatus.textContent = text;
      geoStatus.dataset.state = state;
    }
    function distanceM(a, b) {
      const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    }
    function sendLocation(pos) {
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const now = Date.now();
      // Don't flood the server: send if moved 25m+ or 30s have passed
      if (lastSent && now - lastSent.t < 30000 && distanceM(lastSent, here) < 25) return;
      lastSent = { ...here, t: now };
      api("/api/location", {
        method: "POST",
        body: JSON.stringify({ ...here, accuracy: pos.coords.accuracy }),
      }).then(() => setGeoStatus("📡 Sharing your location with agents", "on")).catch(() => {});
    }
    let watchId = null;
    function startSharing() {
      if (!me) return;
      if (!navigator.geolocation) return setGeoStatus("📡 This device can't share location", "off");
      if (!window.isSecureContext) {
        return setGeoStatus("📡 Location needs a secure (https) address — works on localhost or once online", "off");
      }
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setGeoStatus("📡 Finding your location...", "wait");
      watchId = navigator.geolocation.watchPosition(
        sendLocation,
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setGeoStatus("📡 Location blocked — tap here, then allow it", "off");
          else setGeoStatus("📡 Can't find your location right now — tap to retry", "off");
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 }
      );
    }
    geoStatus?.addEventListener("click", () => {
      lastSent = null;
      startSharing();
    });
    startSharing();

    // ---- Map ----
    function ensureMap() {
      if (map || typeof L === "undefined") return map;
      map = L.map("locate-map", { zoomControl: false, worldCopyJump: true }).setView([39.5, -98.35], 4);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);
      return map;
    }

    function pinIcon(name, live) {
      const isMe = norm(name) === norm(me);
      return L.divIcon({
        className: "agent-pin-wrap",
        iconSize: [64, 84],
        iconAnchor: [32, 32],
        html: `
          <div class="agent-pin ${live ? "is-live" : "is-stale"} ${isMe ? "is-me" : ""}">
            <span class="pin-pulse"></span>
            ${avatar(name)}
            <span class="pin-label">${isMe ? "You" : escapeHtml(name)}</span>
          </div>`,
      });
    }

    function drawPin(loc) {
      if (!map) return;
      const key = norm(loc.agent_name);
      const icon = pinIcon(loc.agent_name, isLive(loc));
      let pin = pins.get(key);
      if (pin) {
        pin.setLatLng([loc.lat, loc.lng]);
        pin.setIcon(icon);
      } else {
        pin = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
        pin.on("click", () => locateAgent(loc.agent_name));
        pins.set(key, pin);
      }
    }

    function renderAgentChips() {
      const list = [...locations.values()].sort((a, b) =>
        norm(a.agent_name) === norm(me) ? -1 : norm(b.agent_name) === norm(me) ? 1 : a.agent_name.localeCompare(b.agent_name));
      locateAgents.innerHTML = list.map((l) => `
        <button class="locate-chip" type="button" data-agent="${escapeHtml(l.agent_name)}">
          ${avatar(l.agent_name)}<span>${norm(l.agent_name) === norm(me) ? "Me" : escapeHtml(l.agent_name)}</span>
        </button>`).join("");
    }
    locateAgents.addEventListener("click", (e) => {
      const chip = e.target.closest(".locate-chip");
      if (chip) locateAgent(chip.getAttribute("data-agent"));
    });

    async function loadLocations() {
      try {
        const data = await api("/api/locations");
        for (const l of data.locations || []) locations.set(norm(l.agent_name), l);
        if (map) for (const l of locations.values()) drawPin(l);
        renderAgentChips();
      } catch (err) {
        console.error("Locations error:", err);
      }
    }

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function showCard(html) {
      locateCard.innerHTML = html;
      locateCard.hidden = false;
    }

    // The cinematic part: scan -> lock -> fly in
    async function locateAgent(name) {
      const run = ++locateRun;
      locateEl.hidden = false;
      document.body.style.overflow = "hidden";
      if (!ensureMap()) {
        showCard(`<div class="card-msg">Map couldn't load. Check the internet connection.</div>`);
        return;
      }
      map.invalidateSize();
      locateCard.hidden = true;

      await loadLocations();
      if (run !== locateRun) return;
      const loc = locations.get(norm(name));
      const isMe = norm(name) === norm(me);

      // Radar scan over a zoomed-out map
      locateScan.hidden = false;
      map.setView(loc ? [loc.lat, loc.lng] : map.getCenter(), 4, { animate: false });
      const steps = loc
        ? [`SCANNING FOR ${isMe ? "YOUR SIGNAL" : "AGENT " + name.toUpperCase()}...`, "TRIANGULATING...", "TARGET LOCKED ✔"]
        : [`SCANNING FOR AGENT ${name.toUpperCase()}...`, "NO SIGNAL..."];
      for (const t of steps) {
        scanText.textContent = t;
        await sleep(850);
        if (run !== locateRun) return;
      }
      locateScan.hidden = true;

      if (!loc) {
        showCard(`
          <div class="card-row">${avatar(name)}<div><div class="card-name">${escapeHtml(name)}</div>
          <div class="card-sub">🛰️ Off the grid — hasn't shared a location yet.</div></div></div>
          <div class="card-actions"><button class="card-btn" data-act="msg" type="button">💬 Message</button></div>`);
        locateCard.dataset.agent = name;
        return;
      }

      // Fly in
      map.flyTo([loc.lat, loc.lng], 17, { duration: 2.6 });
      await sleep(2700);
      if (run !== locateRun) return;
      const pin = pins.get(norm(name));
      pin?.getElement()?.querySelector(".agent-pin")?.classList.add("is-found");

      showCard(`
        <div class="card-row">${avatar(name)}<div>
          <div class="card-name">${isMe ? "You" : escapeHtml(name)}</div>
          <div class="card-sub">${isLive(loc) ? "🟢 Live" : "⚪ Last seen"} · ${escapeHtml(timeAgo(loc.updated_at))}
          ${loc.accuracy ? ` · within ${Math.round(loc.accuracy)} m` : ""}</div>
        </div></div>
        ${isMe ? "" : `<div class="card-actions">
          <button class="card-btn" data-act="msg" type="button">💬 Message</button>
          <button class="card-btn" data-act="call" type="button">🎥 Call</button></div>`}`);
      locateCard.dataset.agent = name;
    }

    locateCard.addEventListener("click", (e) => {
      const act = e.target.closest(".card-btn")?.dataset.act;
      const agent = locateCard.dataset.agent;
      if (!act || !agent) return;
      closeLocate();
      if (act === "msg") openThread(agent);
      if (act === "call") window.imfPrepareCall?.(agent);
    });

    function closeLocate() {
      locateRun++;
      locateEl.hidden = true;
      locateScan.hidden = true;
      document.body.style.overflow = "";
    }
    el("locate-close").addEventListener("click", closeLocate);

    el("btn-locate")?.addEventListener("click", (e) => {
      e.preventDefault();
      openPicker("Who do you want to locate?", locateAgent);
    });

    // Live pin updates from the server
    window.addEventListener("imf:location", (e) => {
      const l = e.detail;
      if (!l?.agent) return;
      const loc = { agent_name: l.agent, lat: l.lat, lng: l.lng, accuracy: l.accuracy, updated_at: l.updated_at };
      locations.set(norm(l.agent), loc);
      if (!locateEl.hidden) {
        drawPin(loc);
        renderAgentChips();
      }
    });

    // =====================================================
    // LOG OUT + DIRECTOR CONSOLE
    // =====================================================
    el("btn-logout")?.addEventListener("click", async () => {
      if (!confirm("Log out of HQ on this device?")) return;
      try { await fetch("/api/logout", { method: "POST" }); } catch {}
      sessionStorage.removeItem("agent_name");
      window.location.href = "index.html";
    });

    if (meInfo.is_director) {
      const dirBtn = el("btn-director");
      const dirPanel = el("director");
      const dirList = el("director-list");
      const dirBadge = el("director-badge");
      dirBtn.hidden = false;

      const statusLabel = { active: "🟢 Active", pending: "🟡 Waiting for you", disabled: "⚪ Switched off" };

      async function loadDirector() {
        try {
          const data = await api("/api/director/agents");
          const agents = data.agents || [];
          const pending = agents.filter((a) => a.status === "pending").length;
          dirBadge.hidden = !pending;
          dirBadge.textContent = pending;
          if (dirPanel.hidden) return;

          dirList.innerHTML = agents.map((a) => {
            const name = escapeHtml(a.agent_name);
            let actions = "";
            if (a.is_director) actions = `<span class="dir-note">That's you</span>`;
            else if (a.status === "pending") actions = `
              <button class="card-btn" data-act="approve" type="button">✅ Approve</button>
              <button class="comms-btn" data-act="reject" type="button">✕ Reject</button>`;
            else actions = `
              <button class="comms-btn" data-act="reset-pin" type="button">🔢 Set PIN</button>
              ${a.status === "active"
                ? `<button class="comms-btn" data-act="deactivate" type="button">Switch off</button>`
                : `<button class="comms-btn" data-act="activate" type="button">Switch on</button>`}`;
            return `
              <div class="dir-row ${a.status === "pending" ? "is-pending" : ""}" data-agent="${name}">
                ${avatar(a.agent_name)}
                <div class="dir-info">
                  <div class="convo-name">${name}${a.is_director ? " 🎖️" : ""}</div>
                  <div class="dir-sub">${statusLabel[a.status] || escapeHtml(a.status)}${!a.is_director && !a.has_pin ? " · no PIN yet" : ""}
                    ${a.email ? ` · ${escapeHtml(a.email)}` : ""}</div>
                  ${a.bio ? `<div class="dir-sub">“${escapeHtml(a.bio)}”</div>` : ""}
                </div>
                <div class="dir-actions">${actions}</div>
              </div>`;
          }).join("") || `<div class="comms-empty">No agents yet.</div>`;
        } catch (err) {
          console.error("Director error:", err);
        }
      }

      dirList.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-act]");
        const row = e.target.closest(".dir-row");
        if (!btn || !row) return;
        const agent = row.dataset.agent;
        const act = btn.dataset.act;
        let body = {};
        if (act === "reject" && !confirm(`Reject ${agent}'s request?`)) return;
        if (act === "deactivate" && !confirm(`Switch off ${agent}? They won't be able to log in.`)) return;
        if (act === "reset-pin") {
          const pin = prompt(`New 4-number PIN for ${agent}:`);
          if (pin === null) return;
          if (!/^\d{4}$/.test(pin.trim())) return alert("PIN must be exactly 4 numbers.");
          body = { pin: pin.trim() };
        }
        const res = await api(`/api/director/agents/${encodeURIComponent(agent)}/${act}`, {
          method: "POST",
          body: JSON.stringify(body),
        }).catch(() => ({}));
        if (!res.success) alert(res.message || "That didn't work.");
        else if (act === "reset-pin") alert(`${agent}'s PIN is set.`);
        loadDirector();
      });

      dirBtn.addEventListener("click", () => {
        dirPanel.hidden = false;
        document.body.style.overflow = "hidden";
        dirList.innerHTML = `<em>Loading agents...</em>`;
        loadDirector();
      });
      el("director-close").addEventListener("click", () => {
        dirPanel.hidden = true;
        document.body.style.overflow = "";
      });
      window.addEventListener("imf:agent-request", loadDirector);
      loadDirector();
    }

    // =====================================================
    // VIDEO CALL (ONE implementation)
    // Incoming call shows Accept/Decline and caller name
    // =====================================================
    const videoBtn = document.getElementById("btn-video-call");
    const callPanel = document.getElementById("call-panel");
    const closeBtn = document.getElementById("btn-call-close");
    const startBtn = document.getElementById("btn-call-start");
    const hangupBtn = document.getElementById("btn-call-hangup");
    const acceptBtn = document.getElementById("btn-call-accept");
    const declineBtn = document.getElementById("btn-call-decline");
    const statusEl = document.getElementById("call-status");
    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");

    // If the call panel isn't present, stop here (prevents index issues)
    if (!videoBtn || !callPanel || !startBtn || !statusEl) return;

    let ws = null;
    let pc = null;
    let localStream = null;
    let remoteStream = null;
    let currentPeer = null;

    let pendingOffer = null;
    let authLost = false;
    let pendingFrom = null;

    function setStatus(msg) {
      statusEl.textContent = msg;
      console.log("[CALL]", msg);
    }

    function openPanel() {
      callPanel.style.display = "block";
      document.body.style.overflow = "hidden";
    }

    function closePanel() {
      callPanel.style.display = "none";
      document.body.style.overflow = "";
    }

    function showIncomingButtons(show) {
      if (acceptBtn) acceptBtn.style.display = show ? "inline-block" : "none";
      if (declineBtn) declineBtn.style.display = show ? "inline-block" : "none";
    }

    async function getLocalMedia() {
      if (localStream) return localStream;

      // This is the exact mobile failure you saw.
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          `Camera/mic unavailable. This usually happens on mobile when using http://LAN-IP. ` +
          `Use https:// or test on localhost. (secureContext=${window.isSecureContext}, url=${location.href})`
        );
      }

      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideo) localVideo.srcObject = localStream;
      return localStream;
    }

function resetPeerConnection({ keepPending = false } = {}) {
  try {
    if (pc) {
      // remove senders so addTrack won't complain next call
      pc.getSenders?.().forEach((s) => {
        try { pc.removeTrack(s); } catch {}
      });
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
  } catch {}

  pc = null;
  remoteStream = null;

  if (remoteVideo) remoteVideo.srcObject = null;

  currentPeer = null;

  // ✅ Only clear pending offer if we are NOT in the middle of accepting it
  if (!keepPending) {
    pendingOffer = null;
    pendingFrom = null;
  }
}



    function ensureWS() {
      if (ws && ws.readyState === WebSocket.OPEN) return;

      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}`);

      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({ type: "register", agent: me }));
        setStatus(`✅ Signaling connected as ${me}`);
      });

      ws.addEventListener("close", () => {
        if (authLost) return;
        console.warn("[CALL] WS closed. Reconnecting in 2s...");
        setStatus("⚠️ Signaling disconnected. Reconnecting...");
        setTimeout(ensureWS, 2000);
      });

      ws.addEventListener("error", () => {
        try { ws.close(); } catch {}
      });

      ws.addEventListener("message", async (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }

        // Login expired / switched off -> back to the start screen
        if (msg.type === "auth-required") {
          authLost = true;
          window.location.href = "index.html";
          return;
        }

        // A new agent asked to join (Director only)
        if (msg.type === "agent-request") {
          window.dispatchEvent(new CustomEvent("imf:agent-request", { detail: msg }));
          return;
        }

        // New chat message for us -> let Secure Comms refresh
        if (msg.type === "new-message") {
          window.dispatchEvent(new CustomEvent("imf:new-message", { detail: msg }));
          return;
        }

        // Someone's map pin moved -> let Locate Agent update
        if (msg.type === "location") {
          window.dispatchEvent(new CustomEvent("imf:location", { detail: msg }));
          return;
        }

        // Incoming offer (someone is calling us)
        if (msg.type === "offer") {
          openPanel();

          pendingOffer = msg.data;
          pendingFrom = msg.from;
          currentPeer = msg.from;

          // Incoming call UI
          setStatus(`📞 Incoming call from ${msg.from}`);
          showIncomingButtons(true);

          // Callee should NOT press Start Call; caller uses Start
          startBtn.style.display = "none";

          return;
        }

        // Incoming answer
        if (msg.type === "answer") {
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
          setStatus(`✅ Connected to ${msg.from}`);
          return;
        }

        // ICE candidates
        if (msg.type === "ice") {
          if (!pc) return;
          try { await pc.addIceCandidate(new RTCIceCandidate(msg.data)); } catch {}
          return;
        }


        if (msg.type === "hangup") {
  setStatus(`Call ended by ${msg.from}`);
  resetPeerConnection();
  showIncomingButtons(false);
  startBtn.style.display = "inline-block";
  return;
}


        if (msg.type === "target-offline") {
          setStatus(`❌ Agent "${msg.to}" is offline.`);
        }
      });
    }

    function createPeerConnection() {
      if (pc) return;

      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      remoteStream = new MediaStream();
      if (remoteVideo) remoteVideo.srcObject = remoteStream;

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate || !ws || !currentPeer) return;
        ws.send(JSON.stringify({
          type: "ice",
          from: norm(me),
          to: norm(currentPeer),
          data: event.candidate
        }));
      };
    }

    async function startCall(target) {
      resetPeerConnection();
      const tgt = norm(target);
      if (!tgt) {
        setStatus("Select an agent first.");
        return;
      }

      currentPeer = tgt;
      ensureWS();

      openPanel();

      // Caller uses Start Call
      startBtn.style.display = "inline-block";
      showIncomingButtons(false);

      setStatus(`📤 Calling ${tgt}...`);

      await getLocalMedia();
      createPeerConnection();
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      ws.send(JSON.stringify({
        type: "offer",
        from: norm(me),
        to: tgt,
        data: offer
      }));

      setStatus(`📨 Offer sent to ${tgt}. Waiting for answer...`);
    }

    async function acceptIncomingCall() {
      resetPeerConnection({ keepPending: true });

      if (!pendingOffer || !pendingFrom) {
        setStatus("No incoming call to accept.");
        return;
      }

      try {
        setStatus(`Answering ${pendingFrom}...`);

        await getLocalMedia();
        createPeerConnection();

        localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(JSON.stringify({
          type: "answer",
          from: norm(me),
          to: norm(pendingFrom),
          data: answer
        }));

        setStatus(`✅ Answer sent to ${pendingFrom}. Connecting...`);
      } catch (err) {
        console.error(err);
        setStatus(`❌ Could not answer: ${err?.message || String(err)}`);
      } finally {
        pendingOffer = null;
        pendingFrom = null;
        showIncomingButtons(false);
        // Once accepted, both sides can use hangup/close; Start remains for callers only
        startBtn.style.display = "none";
      }
    }

    function declineIncomingCall() {
      setStatus("Declined call.");
      pendingOffer = null;
      pendingFrom = null;
      showIncomingButtons(false);
      startBtn.style.display = "inline-block"; // back to normal state
    }

    function hangUp() {
  setStatus("Call ended.");

  if (ws && ws.readyState === WebSocket.OPEN && currentPeer) {
  ws.send(JSON.stringify({
    type: "hangup",
    from: norm(me),
    to: norm(currentPeer)
  }));
}


  resetPeerConnection();   // ✅ ensures next call starts clean

  // Optional: keep local preview alive so kids see themselves.
  // If you want camera to fully stop on hangup, uncomment below:
  /*
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
    if (localVideo) localVideo.srcObject = null;
  }
  */
}


    // -----------------------
    // VIDEO CALL UI (kid-safe flow)
    // -----------------------

    // Get the call screen ready for a chosen agent (also used by the chat's 🎥 button)
    function prepareCall(agent) {
      if (!agent) return;
      ensureWS();
      window.__PBOA_SELECTED_CALL_TARGET__ = agent;
      openPanel();
      showIncomingButtons(false);
      startBtn.style.display = "inline-block";
      setStatus(`Ready to call: ${agent}. Tap Start Call.`);
    }
    window.imfPrepareCall = prepareCall;

    // Video button = pick agent first (no typing), then open panel ready-to-start
    videoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openPicker("Select Agent to Call", prepareCall);
    });

    // Caller Start Call
    startBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const target = window.__PBOA_SELECTED_CALL_TARGET__;
      if (!target) return setStatus("Select an agent first.");

      try {
        await startCall(target);
      } catch (err) {
        console.error(err);
        setStatus(`❌ Start call failed: ${err?.message || String(err)}`);
      }
    });

    // Incoming call Accept/Decline
    acceptBtn?.addEventListener("click", (e) => { e.preventDefault(); acceptIncomingCall(); });
    declineBtn?.addEventListener("click", (e) => { e.preventDefault(); declineIncomingCall(); });

    hangupBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      hangUp();
    });

    closeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      closePanel();
    });

    // Auto connect signaling on load (helps mobile)
    ensureWS();
    window.addEventListener("focus", ensureWS);

    setStatus(`Ready. Agent=${me}. secure=${window.isSecureContext}`);
  })();
}
