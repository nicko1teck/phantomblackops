/* =========================================================
   BRAIN BUSTERS: real, working grade-5 puzzles...
   ...and the Dead Drop. Tap the little footer star to open the
   "Scratch Pad", which sends and receives Phantom messages.
   Those messages are saved with channel "dead_drop".
   Nothing secret shows unless the agent is logged in to Phantom.
   ========================================================= */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ---------------------------------------------------------
  // Puzzles: made fresh from templates, so every page is different.
  // The NEXT page is always built and waiting (hidden), so "Next Page" swaps instantly.
  // ---------------------------------------------------------
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  }
  const NAMES = ["Maya", "Leo", "Ava", "Sam", "Zoe", "Eli", "Nia", "Ben", "Ivy", "Max", "Ruby", "Omar", "Lily", "Jack", "Rosa", "Theo"];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const money = (c) => (c / 100).toFixed(2);
  const clock = (mins) => { const h = Math.floor(mins / 60) % 12 || 12; const m = mins % 60; return `${h}:${String(m).padStart(2, "0")} PM`; };

  // Each template returns { kind, q, answer: [accepted...], choices? }
  const TEMPLATES = [
    () => { const cap = pick([24, 28, 32, 36, 40, 48]); let kids; do { kids = rnd(cap * 3 + 1, cap * 6 - 1); } while (kids % cap === 0);
      return { kind: "Word problem", q: `A school bus holds ${cap} students. How many buses are needed to take ${kids} students on a field trip?`, answer: [String(Math.ceil(kids / cap))] }; },
    () => { const a = rnd(2, 20), d = rnd(3, 12); const seq = [0, 1, 2, 3].map((i) => a + i * d);
      return { kind: "Pattern", q: `What number comes next? ${seq.join(", ")}, ___`, answer: [String(a + 4 * d)] }; },
    () => { const a = rnd(1, 5), r = pick([2, 3]); const seq = [0, 1, 2, 3].map((i) => a * r ** i);
      return { kind: "Pattern", q: `What comes next? ${seq.join(", ")}, ___`, answer: [String(a * r ** 4)] }; },
    () => { const [n2, d2] = pick([[3, 4], [2, 3], [1, 2], [4, 5], [5, 6]]); const [n1, d1] = pick([[1, 2], [1, 3], [1, 4], [2, 3]]);
      let n = n1 * n2, d = d1 * d2; const g = gcd(n, d); n /= g; d /= g; const who = pick(NAMES);
      return { kind: "Fractions", q: `${who} has ${n2}/${d2} of a pizza and eats ${n1}/${d1} of it. What fraction of the whole pizza did ${who} eat?`, answer: [`${n}/${d}`, ...(String(n / d).length <= 6 ? [String(n / d)] : [])] }; },
    () => { const [n, d] = pick([[1, 2], [1, 3], [2, 3], [3, 4], [1, 4], [2, 5]]); const k = rnd(2, 4);
      const right = `${n * k}/${d * k}`;
      const sameValue = (f) => { const [a, b] = f.split("/").map(Number); return a * d === b * n; };
      const wrong = shuffle([`${n * k + 1}/${d * k}`, `${n * k}/${d * k + 1}`, `${n + k}/${d + k}`, `${n * k - 1}/${d * k}`, `${n + 1}/${d}`, `${n}/${d + 1}`, `${n * k + 2}/${d * k}`])
        .filter((w, i, all) => !sameValue(w) && !w.startsWith("0/") && all.indexOf(w) === i).slice(0, 3);
      return { kind: "Fractions", q: `Which fraction is the same as ${n}/${d}?`, choices: shuffle([right, ...wrong]), answer: [right] }; },
    () => { const l = rnd(5, 20), w = rnd(3, 12); return { kind: "Geometry", q: `A rectangle is ${l} cm long and ${w} cm wide. What is its perimeter, in cm?`, answer: [String(2 * (l + w))] }; },
    () => { const sd = rnd(4, 12); return { kind: "Geometry", q: `Each side of a square is ${sd} inches long. What is its area, in square inches?`, answer: [String(sd * sd)] }; },
    () => { const a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 20);
      return pick([
        { kind: "Order of operations", q: `What is ${a} × ${b} + ${c}?`, answer: [String(a * b + c)] },
        { kind: "Order of operations", q: `What is ${c} + ${a} × ${b}?`, answer: [String(c + a * b)] },
      ]); },
    () => { const n = rnd(1000, 9999); const to = pick([10, 100]);
      return { kind: "Rounding", q: `Round ${n.toLocaleString("en-US")} to the nearest ${to === 10 ? "ten" : "hundred"}.`, answer: [String(Math.round(n / to) * to)] }; },
    () => { const start = rnd(1, 8) * 60 + pick([0, 15, 30, 45]); const dur = rnd(1, 2) * 60 + pick([10, 20, 25, 35, 40, 50]); const end = start + dur;
      const right = clock(end); const wrong = shuffle([clock(end + 20), clock(end - 20), clock(end + 60), clock(end - 60)]).slice(0, 3);
      return { kind: "Time", q: `A movie starts at ${clock(start)} and lasts ${Math.floor(dur / 60)} hour${dur >= 120 ? "s" : ""} ${dur % 60} minutes. When does it end?`, choices: shuffle([right, ...wrong]), answer: [right] }; },
    () => { const c = rnd(3, 19) * 5, n = rnd(3, 9); const item = pick(["pencil", "eraser", "sticker", "bookmark"]);
      return { kind: "Money", q: `${/^[aeiou]/.test(item) ? "An" : "A"} ${item} costs $${money(c)}. How much do ${n} of them cost, in dollars?`, answer: [money(c * n), String(+(c * n / 100))] }; },
    () => { const h = rnd(2, 6), half = Math.random() < 0.5;
      return { kind: "Time", q: `How many minutes are in ${h}${half ? "½" : ""} hours?`, answer: [String(h * 60 + (half ? 30 : 0))] }; },
    () => { const a = rnd(3, 12), b = rnd(3, 12); return { kind: "Missing number", q: `${a} × ___ = ${a * b}`, answer: [String(b)] }; },
    () => { const lee = rnd(6, 20), k = pick([2, 3]); const [x, y] = shuffle(NAMES).slice(0, 2);
      return { kind: "Logic", q: `${x} has ${k === 2 ? "twice" : "three times"} as many marbles as ${y}. Together they have ${lee * (k + 1)} marbles. How many does ${x} have?`, answer: [String(lee * k)] }; },
    () => { const d = rnd(0, 6), add = rnd(8, 20); const right = DAYS[(d + add) % 7];
      return { kind: "Logic", q: `If today is ${DAYS[d]}, what day will it be ${add} days from now?`, choices: shuffle([right, ...shuffle(DAYS.filter((x) => x !== right)).slice(0, 3)]), answer: [right] }; },
    () => { const ppl = shuffle(NAMES).slice(0, 4); const asks = [["second shortest", 2], ["second tallest", 1], ["shortest", 3], ["tallest", 0]]; const [word, idx] = pick(asks);
      return { kind: "Logic", q: `${ppl[0]} is taller than ${ppl[1]}. ${ppl[1]} is taller than ${ppl[2]}. ${ppl[2]} is taller than ${ppl[3]}. Who is the ${word}?`, choices: shuffle(ppl), answer: [ppl[idx]] }; },
    () => { const a = rnd(2, 9) / 10, b = +(rnd(11, 99) / 100).toFixed(2); if (Math.abs(a - b) < 0.01) return TEMPLATES[16]();
      const big = a > b ? String(a) : String(b);
      return { kind: "Decimals", q: "Which number is bigger?", choices: shuffle([String(a), String(b)]), answer: [big] }; },
    () => { const per = rnd(6, 12), boxes = rnd(6, 15); const who = pick(NAMES);
      return { kind: "Word problem", q: `${who} bakes ${per * boxes} cookies and puts ${per} in each box. How many boxes get filled?`, answer: [String(boxes)] }; },
  ];
  const WARMUPS = [
    "Sphinx of black quartz, judge my vow!",
    "The five boxing wizards jump quickly.",
    "Pack my box with five dozen juicy grapes and a big quilt!",
    "How vexingly quick daft zebras jump!",
    "The quick brown fox jumps over the lazy dog.",
  ];
  const FACTS = [
    "An octopus has 3 hearts & 9 brains (sort of)!",
    "Honey never spoils; jars 3,000 years old were still good!",
    "A day on Venus is longer than its year!",
    "Owls can turn their heads about 270 degrees!",
    "Zero (0) was a huge idea in math history!",
  ];
  const PER_PAGE = 8;
  const tidy = (s) => String(s).toLowerCase().replace(/[\s$,]/g, "").replace(/inches|inch|in\b|minutes/g, "");

  // Page number carries on between visits, so it looks like real progress
  let pageNo = (() => { try { return Number(localStorage.getItem("bb-page")) || rnd(3, 9); } catch { return rnd(3, 9); } })();
  const savePage = () => { try { localStorage.setItem("bb-page", String(pageNo)); } catch {} };

  function buildPage(n) {
    const page = document.createElement("div");
    page.className = "bb-page";
    page.hidden = true;
    page.dataset.page = n;
    const kinds = shuffle(TEMPLATES).slice(0, PER_PAGE).map((t) => t());
    page.innerHTML = `
      <div class="bb-warmup">
        <span class="bb-warmup-tag">Warm-up</span>
        <p>Read it out loud: "${esc(pick(WARMUPS))}" Then count 0, 1, 2, 3, 4, 5, 6, 7, 8, 9... ready? (Go!)
          Rule #1: try your best &amp; give 100% effort; mistakes are how brains grow + get stronger. Q: What's 1/2 of 10? A = 5.
          Fun fact @ Math Flash Brain Busters: ${esc(pick(FACTS))}</p>
      </div>
      <section class="bb-grid" aria-label="Puzzles"></section>`;
    const grid = page.querySelector(".bb-grid");
    page._score = 0; page._tried = 0;
    kinds.forEach((p, i) => {
      const card = document.createElement("article");
      card.className = "bb-card";
      card.innerHTML = `
        <div class="bb-kind">${i + 1}. ${esc(p.kind)}</div>
        <p class="bb-q">${esc(p.q)}</p>
        <div class="bb-answer">${p.choices
          ? `<div class="bb-choices">${p.choices.map((c) => `<button type="button" class="bb-choice" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>`
          : `<input class="bb-input" type="text" inputmode="decimal" placeholder="Your answer" aria-label="Your answer" />`}
        </div>
        <div class="bb-answer"><button type="button" class="bb-btn bb-check">Check</button></div>
        <div class="bb-feedback" aria-live="polite"></div>`;
      let picked = null, attempted = false, solved = false;
      card.querySelectorAll(".bb-choice").forEach((b) => b.addEventListener("click", () => {
        card.querySelectorAll(".bb-choice").forEach((x) => x.classList.remove("is-picked"));
        b.classList.add("is-picked");
        picked = b.dataset.v;
      }));
      const input = card.querySelector(".bb-input");
      const check = () => {
        const given = p.choices ? picked : input.value;
        const fb = card.querySelector(".bb-feedback");
        if (given == null || !String(given).trim()) { fb.textContent = "Pick or type an answer first!"; fb.className = "bb-feedback no"; return; }
        const right = p.answer.some((a) => tidy(a) === tidy(given));
        if (!attempted) { page._tried += 1; attempted = true; }
        if (right && !solved) { page._score += 1; solved = true; }
        card.classList.toggle("is-right", right);
        card.classList.toggle("is-wrong", !right);
        fb.textContent = right ? "✅ Correct! Nice thinking!" : "❌ Not quite. Try again!";
        fb.className = `bb-feedback ${right ? "ok" : "no"}`;
        showScore();
      };
      card.querySelector(".bb-check").addEventListener("click", check);
      input?.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
      grid.appendChild(card);
    });
    wrapLetters(page);
    return page;
  }

  const pagesBox = $("bb-pages");
  let current = null, upcoming = null;
  function showScore() {
    const sc = current ? current._score : 0, tr = current ? current._tried : 0;
    $("bb-score-text").textContent = `Score: ${sc} / ${tr}`;
    $("bb-stars").textContent = sc ? "⭐".repeat(Math.min(sc, 8)) : "";
  }
  function showPageNo() { $("bb-page-no").textContent = `Page ${pageNo}`; }
  function prepareNext() {
    upcoming = buildPage(pageNo + 1);
    pagesBox.appendChild(upcoming);
  }
  // Swap to the page that's already waiting: instant, no loading
  function nextPage() {
    if (!upcoming) prepareNext();
    const old = current;
    current = upcoming;
    current.hidden = false;
    old?.remove();
    upcoming = null;
    pageNo += 1;
    savePage();
    showPageNo();
    showScore();
    setTimeout(prepareNext, 0); // build the one after it in the background
  }

  // Every letter, digit and punctuation mark on the page becomes its own little span,
  // so the reveal can pick them up and fly them into place.
  function wrapLetters(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (p.closest("script, style, input, textarea, select, .bb-check, .bb-feedback, .bb-score, .bb-star, .bb-logo, .bb-page-no, .bb-next, .scratch, .ch"))
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const frag = document.createDocumentFragment();
      for (const c of Array.from(n.nodeValue)) {
        if (/\s/.test(c)) { frag.appendChild(document.createTextNode(c)); continue; }
        const sp = document.createElement("span");
        sp.className = "ch";
        sp.textContent = c;
        frag.appendChild(sp);
      }
      n.parentNode.replaceChild(frag, n);
    }
  }
  wrapLetters(document.querySelector(".bb-header"));
  wrapLetters(document.querySelector(".bb-intro"));
  wrapLetters(document.querySelector(".bb-footer"));

  // first visit: show this page with the next one already waiting
  pageNo -= 1;
  prepareNext();
  nextPage();

  // ---------------------------------------------------------
  // The Dead Drop
  //   OUT: tap the footer star -> Scratch Pad (send only)
  //   IN:  press and hold the owl (or hold the ` key) -> the page's own letters
  //        fly together to spell the newest incoming message; let go and they fly home
  // ---------------------------------------------------------
  const star = $("bb-star"), pad = $("scratch"), to = $("scratch-to"), input = $("scratch-input"), note = $("scratch-note");
  let me = null;        // logged-in agent, or null (then nothing secret works)
  let latest = null;    // newest incoming message

  async function api(path, opts = {}) {
    const { background, ...rest } = opts;
    const res = await fetch(path, {
      ...rest,
      headers: { "Content-Type": "application/json", ...(background ? { "X-IMF-Background": "1" } : {}), ...(rest.headers || {}) },
    });
    if (res.status === 401) { goneQuiet(); throw new Error("signed out"); }
    return res.json();
  }

  // Signed out or session over: hide everything secret, never show a Phantom screen
  function goneQuiet() {
    me = null;
    latest = null;
    pad.hidden = true;
    star.classList.remove("has-news");
    $("bb-owl").classList.remove("has-news");
  }

  // Doing puzzles counts as activity, so the Phantom session doesn't time out (at most once a minute)
  let lastPing = 0;
  ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, () => {
    if (!me || Date.now() - lastPing < 60000) return;
    lastPing = Date.now();
    api("/api/me").catch(() => {});
  }, { passive: true }));

  async function refreshNews() {
    if (!me) return null;
    const data = await api("/api/conversations", { background: true }).catch(() => null);
    if (!data) return null;
    const convos = data.conversations || [];
    const unread = convos.reduce((n, c) => n + (c.unread || 0), 0);
    star.classList.toggle("has-news", unread > 0); // a quiet "something's waiting"
    $("bb-owl").classList.toggle("has-news", unread > 0); // ...and the owl's eyebrows turn orange
    return convos;
  }
  async function refreshLatest() {
    if (!me) return;
    const data = await api("/api/messages/latest-incoming", { background: true }).catch(() => null);
    if (data) latest = data.message;
  }

  // ---- OUT: the Scratch Pad ----
  async function fillRecipients() {
    const [agentsData, convos] = await Promise.all([api("/api/agents", { background: true }).catch(() => ({})), refreshNews()]);
    const names = (agentsData.agents || []).filter((n) => n && n.toLowerCase() !== me.toLowerCase());
    const order = [...(convos || []).map((c) => c.agent), ...names]
      .filter((n, i, all) => all.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
    const keep = to.value;
    to.innerHTML = order.map((n) => `<option value="${esc(n)}">to: ${esc(n)}</option>`).join("");
    if (keep && order.includes(keep)) to.value = keep;
  }
  star.addEventListener("click", () => {
    if (!me) return; // just a star
    if (pad.hidden) { pad.hidden = false; note.textContent = ""; fillRecipients(); } else pad.hidden = true;
  });
  $("scratch-close").addEventListener("click", () => { pad.hidden = true; });

  const quick = (window.IMF_QUICK_MESSAGES && window.IMF_QUICK_MESSAGES.starterFavorites) || ["👋 Hi!", "✅ Yes", "❌ No", "👍 OK"];
  $("scratch-chips").innerHTML = quick.map((t) => `<button type="button" class="scratch-chip">${esc(t)}</button>`).join("");
  $("scratch-chips").addEventListener("click", (e) => {
    const b = e.target.closest(".scratch-chip");
    if (!b) return;
    input.value = input.value ? `${input.value} ${b.textContent}` : b.textContent;
    input.focus();
  });
  $("scratch-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = input.value.trim();
    if (!me || !to.value || !content) return;
    input.value = "";
    try {
      await api("/api/messages", { method: "POST", body: JSON.stringify({ recipient: to.value, content, channel: "dead_drop" }) });
      note.textContent = "✓ noted";
      setTimeout(() => { note.textContent = ""; }, 2500);
    } catch {
      input.value = content; // put it back so nothing is lost
    }
  });

  // ---- IN: the reveal ----
  const graphemes = (str) => (window.Intl && Intl.Segmenter
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(str), (s) => s.segment)
    : Array.from(str));
  const FONT = '700 SIZEpx "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
  const INK = "#23324a";
  const measureCtx = document.createElement("canvas").getContext("2d");

  // Where each character of the message should land (centered, word-wrapped, as big as fits)
  function layout(text) {
    const glyphs = graphemes(text);
    const maxW = Math.min(window.innerWidth * 0.88, 900);
    for (let size = 46; size >= 14; size -= 2) {
      measureCtx.font = FONT.replace("SIZE", size);
      const lh = size * 1.35;
      const lines = [[]];
      let lineW = 0, word = [], wordW = 0;
      const flushWord = () => {
        if (!word.length) return;
        if (lineW + wordW > maxW && lines[lines.length - 1].length) { lines.push([]); lineW = 0; }
        for (const g of word) { lines[lines.length - 1].push({ ...g, x: lineW + g.dx }); }
        lineW += wordW;
        word = []; wordW = 0;
      };
      for (const c of glyphs) {
        const w = measureCtx.measureText(c).width;
        if (c === " ") { flushWord(); if (lineW) lineW += w; continue; }
        word.push({ c, w, dx: wordW });
        wordW += w;
      }
      flushWord();
      const height = lines.length * lh;
      if (height <= window.innerHeight * 0.8 || size === 14) {
        const top = (window.innerHeight - height) / 2;
        const out = [];
        lines.forEach((line, i) => {
          const width = line.length ? line[line.length - 1].x + line[line.length - 1].w : 0;
          const left = (window.innerWidth - width) / 2;
          for (const g of line) out.push({ c: g.c, x: left + g.x, y: top + i * lh, size });
        });
        return out;
      }
    }
    return [];
  }

  let layer = null, flying = [], cleanupTimer = null, revealed = false;

  function finishCleanup() {
    clearTimeout(cleanupTimer);
    layer?.remove();
    layer = null;
    document.querySelectorAll(".ch.is-lifted").forEach((s) => s.classList.remove("is-lifted"));
    flying = [];
  }

  function reveal() {
    if (!me || !latest || revealed) return;
    finishCleanup();
    revealed = true;
    const text = `${latest.sender}: ${latest.content}`;
    const targets = layout(text);

    // the page's characters, grouped, in random order so letters come from all over
    const pool = new Map();
    for (const sp of shuffle(Array.from(document.querySelectorAll(".ch")).filter((x) => !x.closest("[hidden]")))) {
      const k = sp.textContent;
      if (!pool.has(k)) pool.set(k, []);
      pool.get(k).push(sp);
    }
    const used = new Map();
    const take = (c) => {
      for (const k of [c, c.toLowerCase(), c.toUpperCase()]) {
        const list = pool.get(k);
        if (list && list.length) { const sp = list.pop(); (used.get(k) || used.set(k, []).get(k)).push(sp); return sp; }
      }
      for (const k of [c, c.toLowerCase(), c.toUpperCase()]) { // ran out: borrow one already flying
        const u = used.get(k);
        if (u && u.length) return u[Math.floor(Math.random() * u.length)];
      }
      return null; // not on the page (an emoji, say): it just appears
    };

    layer = document.createElement("div");
    layer.className = "dd-layer";
    document.body.appendChild(layer);

    targets.forEach((t, i) => {
      const sp = take(t.c);
      const g = document.createElement("div");
      g.className = "dd-glyph";
      g.textContent = t.c;
      g.style.transitionDelay = `${Math.min(i * 14, 450)}ms`;
      let from;
      if (sp) {
        const r = sp.getBoundingClientRect();
        const cs = getComputedStyle(sp);
        const fs = parseFloat(cs.fontSize) || 16;
        from = { x: r.left, y: r.top + (r.height - fs) / 2, scale: 1, color: cs.color, opacity: 1 };
        g.style.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
        g.dataset.base = fs;
        sp.classList.add("is-lifted");
      } else {
        from = { x: t.x, y: t.y, scale: 1, color: INK, opacity: 0 };
        g.style.font = FONT.replace("SIZE", t.size);
        g.dataset.base = t.size;
      }
      const toScale = t.size / Number(g.dataset.base);
      g.style.transform = `translate(${from.x}px, ${from.y}px) scale(${from.scale})`;
      g.style.color = from.color;
      g.style.opacity = from.opacity;
      layer.appendChild(g);
      flying.push({ g, from, to: { x: t.x, y: t.y, scale: toScale } });
    });

    document.body.classList.add("dd-reveal");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const f of flying) {
        f.g.style.transform = `translate(${f.to.x}px, ${f.to.y}px) scale(${f.to.scale})`;
        f.g.style.color = INK;
        f.g.style.opacity = 1;
      }
    }));

    // it's been read now
    if (!latest.read_at) {
      const from = latest.sender;
      latest.read_at = new Date().toISOString();
      api(`/api/thread/${encodeURIComponent(from)}/read`, { method: "POST", background: true }).then(refreshNews).catch(() => {});
    }
  }

  function unreveal() {
    if (!revealed) return;
    revealed = false;
    document.body.classList.remove("dd-reveal");
    for (const f of flying) {
      f.g.style.transitionDelay = "0ms";
      f.g.style.transform = `translate(${f.from.x}px, ${f.from.y}px) scale(${f.from.scale})`;
      f.g.style.color = f.from.color;
      f.g.style.opacity = f.from.opacity;
    }
    cleanupTimer = setTimeout(finishCleanup, 750);
    // a self-destructing message burns once it's been read here
    if (latest && latest.self_destruct) {
      const id = latest.id;
      latest = null;
      api(`/api/messages/${id}/burn`, { method: "POST", background: true }).then(refreshLatest).catch(() => {});
    }
  }

  // Press and hold the owl (finger or mouse)...
  const owl = $("bb-owl");
  owl.addEventListener("pointerdown", (e) => { if (!me || !latest) return; e.preventDefault(); reveal(); });
  owl.addEventListener("contextmenu", (e) => e.preventDefault());
  ["pointerup", "pointercancel"].forEach((ev) => window.addEventListener(ev, unreveal));
  window.addEventListener("blur", unreveal);
  // The ` key by its position on the keyboard (some Windows layouts treat ` as a
  // "dead key" for accents, so the typed character isn't reported, but the key is)
  const isRevealKey = (e) => e.code === "Backquote" || e.key === "`";
  // ...or hold the ` key (top-left of the keyboard), unless typing an answer
  window.addEventListener("keydown", (e) => {
    if (!isRevealKey(e) || e.repeat || e.target.closest?.("input, textarea, select")) return;
    e.preventDefault();
    reveal();
  });
  window.addEventListener("keyup", (e) => { if (isRevealKey(e)) unreveal(); });

  // ---- EMERGENCY: Next Page ----
  // Instantly: the message vanishes, the scratch pad closes and empties,
  // and the waiting page appears, as if he just moved on to the next worksheet.
  function emergencyNext() {
    document.body.classList.add("dd-instant"); // no fades, no flying
    revealed = false;
    finishCleanup();
    document.body.classList.remove("dd-reveal");
    pad.hidden = true;
    input.value = "";
    note.textContent = "";
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    nextPage();
    window.scrollTo(0, 0);
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("dd-instant")));
  }
  $("bb-next").addEventListener("click", emergencyNext);
  // Esc works anytime, even mid-reveal
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); emergencyNext(); } });
  // mid-reveal on a touchscreen: tap anywhere with another finger
  window.addEventListener("pointerdown", (e) => { if (revealed && !e.target.closest("#bb-owl")) emergencyNext(); });

  // Live news over the same connection the dossier uses
  function connect() {
    const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`);
    ws.addEventListener("open", () => ws.send(JSON.stringify({ type: "register", agent: me })));
    ws.addEventListener("message", (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === "auth-required") { goneQuiet(); ws.close(); return; }
      if (msg.type === "new-message") { refreshLatest(); refreshNews(); }
    });
    ws.addEventListener("close", () => { if (me) setTimeout(connect, 3000); });
  }

  // Are we a logged-in agent? (quietly; a visitor just sees a puzzle page)
  fetch("/api/me", { headers: { "X-IMF-Background": "1" } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !d.agent) return;
      me = d.agent.agent_name;
      refreshNews();
      refreshLatest();
      connect();
    })
    .catch(() => {});
})();
