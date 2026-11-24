/* =========================================================
   MATH FLASH BRAIN BUSTERS: real, working grade-5 puzzles.
   A course code turns on progress tracking and the scratch pad
   (footer star). Sign out turns them off again instantly.
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
  // Every problem is a little story, so a message in one of them doesn't stand out.
  const TEACHERS = ["Ms. Rivera", "Mr. Chen", "Mrs. Patel", "Mr. Brooks", "Ms. Okafor", "Mrs. Lund"];
  const two = () => shuffle(NAMES).slice(0, 2);
  const TEMPLATES = [
    () => { const cap = pick([24, 28, 32, 36, 40, 48]); let kids; do { kids = rnd(cap * 3 + 1, cap * 6 - 1); } while (kids % cap === 0);
      return { kind: "Word problem", q: `${pick(TEACHERS)}'s whole grade is going on a field trip to the science museum. ${kids} students turned in their permission slips, and each school bus can carry ${cap} students. Nobody can be left behind, and no bus can be overfilled. What is the smallest number of buses the school needs?`, answer: [String(Math.ceil(kids / cap))] }; },
    () => { const a = rnd(2, 20), d = rnd(3, 12); const seq = [0, 1, 2, 3].map((i) => a + i * d); const who = pick(NAMES);
      return { kind: "Pattern", q: `${who} is saving up for a new bike. Every week ${who} puts the same amount of money into a jar, and writes down the total at the end of each week: $${seq.join(", $")}. If ${who} keeps saving the same way, how many dollars will be in the jar at the end of week 5?`, answer: [String(a + 4 * d), "$" + (a + 4 * d)] }; },
    () => { const a = rnd(1, 5), r = pick([2, 3]); const seq = [0, 1, 2, 3].map((i) => a * r ** i);
      return { kind: "Pattern", q: `In science class, a magic bean plant grows new leaves in a pattern. ${pick(TEACHERS)} counts the leaves every morning and writes them on the board: ${seq.join(", ")}. The number keeps multiplying the same way each day. How many leaves will the plant have tomorrow morning?`, answer: [String(a * r ** 4)] }; },
    () => { const [n2, d2] = pick([[3, 4], [2, 3], [1, 2], [4, 5], [5, 6]]); const [n1, d1] = pick([[1, 2], [1, 3], [1, 4], [2, 3]]);
      let n = n1 * n2, d = d1 * d2; const g = gcd(n, d); n /= g; d /= g; const who = pick(NAMES);
      return { kind: "Fractions", q: `After the soccer game, ${who} brings home ${n2}/${d2} of a large pizza in a box. Later that night ${who} gets hungry and eats ${n1}/${d1} of what is left in the box. What fraction of the WHOLE pizza did ${who} eat? Write your answer as a fraction.`, answer: [`${n}/${d}`, ...(String(n / d).length <= 6 ? [String(n / d)] : [])] }; },
    () => { const [n, d] = pick([[1, 2], [1, 3], [2, 3], [3, 4], [1, 4], [2, 5]]); const k = rnd(2, 4); const [x, y] = two();
      const right = `${n * k}/${d * k}`;
      const sameValue = (f) => { const [a, b] = f.split("/").map(Number); return a * d === b * n; };
      const wrong = shuffle([`${n * k + 1}/${d * k}`, `${n * k}/${d * k + 1}`, `${n + k}/${d + k}`, `${n * k - 1}/${d * k}`, `${n + 1}/${d}`, `${n}/${d + 1}`, `${n * k + 2}/${d * k}`])
        .filter((w, i, all) => !sameValue(w) && !w.startsWith("0/") && all.indexOf(w) === i).slice(0, 3);
      return { kind: "Fractions", q: `${x} cuts a ribbon into ${d} equal pieces and uses ${n} of them for an art project, so ${x} used ${n}/${d} of the ribbon. ${y} has a ribbon of the same length, cut into ${d * k} equal pieces. Which fraction of the ribbon should ${y} use to match ${x} exactly?`, choices: shuffle([right, ...wrong]), answer: [right] }; },
    () => { const l = rnd(5, 20), w = rnd(3, 12); const who = pick(NAMES);
      return { kind: "Geometry", q: `${who} is building a fence around a rectangular vegetable garden that is ${l} meters long and ${w} meters wide. The fence has to go all the way around the outside edge of the garden, with no gaps for the rabbits to sneak through. How many meters of fence does ${who} need?`, answer: [String(2 * (l + w))] }; },
    () => { const sd = rnd(4, 12);
      return { kind: "Geometry", q: `The art room has a square rug that is ${sd} feet long on each side. ${pick(TEACHERS)} wants to cover the whole rug with square sheets of paper that are 1 foot by 1 foot, so the class can paint a giant mural on top. How many sheets of paper will it take to cover the rug?`, answer: [String(sd * sd)] }; },
    () => { const a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 20); const t = pick(TEACHERS);
      return pick([
        { kind: "Order of operations", q: `${t} writes a number sentence on the board and reminds the class to multiply before they add, even though the plus sign comes first when you read it. Solve it the right way: ${c} + ${a} × ${b} = ?`, answer: [String(c + a * b)] },
        { kind: "Order of operations", q: `${t} writes a number sentence on the board and asks everyone to solve it in their notebooks, remembering that multiplication always comes before addition. What is the answer to ${a} × ${b} + ${c}?`, answer: [String(a * b + c)] },
      ]); },
    () => { const n = rnd(1000, 9999); const to = pick([10, 100]);
      return { kind: "Rounding", q: `The town newspaper reports that ${n.toLocaleString("en-US")} people came to the fall festival this weekend. The editor wants the headline to use a rounder number that is easier to read, so the reporter rounds it to the nearest ${to === 10 ? "ten" : "hundred"}. What number goes in the headline?`, answer: [String(Math.round(n / to) * to)] }; },
    () => { const start = rnd(1, 8) * 60 + pick([0, 15, 30, 45]); const dur = rnd(1, 2) * 60 + pick([10, 20, 25, 35, 40, 50]); const end = start + dur; const [x, y] = two();
      const right = clock(end); const wrong = shuffle([clock(end + 20), clock(end - 20), clock(end + 60), clock(end - 60)]).slice(0, 3);
      return { kind: "Time", q: `${x} and ${y} go to the movies on Saturday. The movie starts at ${clock(start)} and lasts ${Math.floor(dur / 60)} hour${dur >= 120 ? "s" : ""} and ${dur % 60} minutes, with no previews. Their ride will pick them up the moment it ends. What time should they ask to be picked up?`, choices: shuffle([right, ...wrong]), answer: [right] }; },
    () => { const c = rnd(3, 19) * 5, n = rnd(3, 9); const item = pick(["pencil", "eraser", "sticker", "bookmark"]); const who = pick(NAMES);
      return { kind: "Money", q: `The school store is having a back-to-school sale. ${/^[aeiou]/.test(item) ? "An" : "A"} ${item} costs $${money(c)}. ${who} wants to buy one for each of the ${n} kids in the reading group as a surprise. How much money will ${who} need altogether, in dollars?`, answer: [money(c * n), String(+(c * n / 100))] }; },
    () => { const h = rnd(2, 6), half = Math.random() < 0.5; const who = pick(NAMES);
      return { kind: "Time", q: `${who}'s family is driving to visit Grandma for the holidays. The trip takes ${h}${half ? "½" : ""} hours, and ${who} wants to count down the trip in minutes instead of hours to make it feel shorter. How many minutes long is the drive to Grandma's house?`, answer: [String(h * 60 + (half ? 30 : 0))] }; },
    () => { const a = rnd(3, 12), b = rnd(3, 12); const who = pick(NAMES);
      return { kind: "Missing number", q: `${who} is setting up chairs for the class play. Every row has exactly ${a} chairs, and there are ${a * b} chairs in all. Fill in the missing number to show how many rows ${who} made: ${a} × ___ = ${a * b}`, answer: [String(b)] }; },
    () => { const lee = rnd(6, 20), k = pick([2, 3]); const [x, y] = two();
      return { kind: "Logic", q: `${x} and ${y} pour their marble collections into one big jar to count them. ${x} has ${k === 2 ? "twice" : "three times"} as many marbles as ${y}. Together they count ${lee * (k + 1)} marbles in the jar. How many marbles did ${x} bring?`, answer: [String(lee * k)] }; },
    () => { const d = rnd(0, 6), add = rnd(8, 20); const right = DAYS[(d + add) % 7]; const who = pick(NAMES);
      return { kind: "Logic", q: `Today is ${DAYS[d]}. ${who}'s birthday party is exactly ${add} days from today, and ${who} needs to write the day of the week on all the invitations before mailing them. What day of the week will the party be?`, choices: shuffle([right, ...shuffle(DAYS.filter((x) => x !== right)).slice(0, 3)]), answer: [right] }; },
    () => { const ppl = shuffle(NAMES).slice(0, 4); const asks = [["second shortest", 2], ["second tallest", 1], ["shortest", 3], ["tallest", 0]]; const [word, idx] = pick(asks);
      return { kind: "Logic", q: `Four friends are lining up for the class photo. ${ppl[0]} is taller than ${ppl[1]}. ${ppl[1]} is taller than ${ppl[2]}. ${ppl[2]} is taller than ${ppl[3]}. The photographer asks the ${word} of the four to hold the class sign. Who holds the sign?`, choices: shuffle(ppl), answer: [ppl[idx]] }; },
    () => { let a, b; do { a = rnd(2, 9) / 10; b = +(rnd(11, 99) / 100).toFixed(2); } while (Math.abs(a - b) < 0.01);
      const big = a > b ? String(a) : String(b); const who = pick(NAMES);
      return { kind: "Decimals", q: `${who} is packing for a long hike and can only carry one water bottle. The blue bottle holds ${a} liters and the green bottle holds ${b} liters. ${who} wants to bring the bottle that holds more water. How many liters does that bottle hold?`, choices: shuffle([String(a), String(b)]), answer: [big] }; },
    () => { const per = rnd(6, 12), boxes = rnd(6, 15); const who = pick(NAMES);
      return { kind: "Word problem", q: `For the school bake sale, ${who} bakes ${per * boxes} chocolate chip cookies and packs them into boxes. Each box holds exactly ${per} cookies, and every box has to be completely full before it goes on the sale table. How many full boxes can ${who} make?`, answer: [String(boxes)] }; },
  ];
  // The problem that carries messages is always this number, and always a story you type an answer to
  const SECRET_PROBLEM = 4;
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
    // make the message-carrying problem a typed-answer story (room for a sentence, no answer buttons)
    const typed = kinds.findIndex((k) => !k.choices);
    if (typed > -1 && kinds[SECRET_PROBLEM - 1].choices) [kinds[SECRET_PROBLEM - 1], kinds[typed]] = [kinds[typed], kinds[SECRET_PROBLEM - 1]];
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
    // (letters no longer need wrapping: the reveal morphs one problem instead)
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

  // first visit: show this page with the next one already waiting
  pageNo -= 1;
  prepareNext();
  nextPage();

  // ---------------------------------------------------------
  // Notes
  //   OUT: tap the footer star -> Scratch Pad (send only)
  //   IN:  press and hold the owl (or hold the ` key) -> the page's own letters
  //        fly together to spell the newest incoming message; let go and they fly home
  // ---------------------------------------------------------
  const star = $("bb-star"), pad = $("scratch"), to = $("scratch-to"), input = $("scratch-input"), note = $("scratch-note");
  let me = null;        // signed-in student, or null (then it's just a puzzle page)
  let sock = null;      // live connection while signed in
  let latest = null;    // newest incoming message

  async function api(path, opts = {}) {
    const { background, ...rest } = opts;
    const res = await fetch(path, {
      ...rest,
      headers: { "Content-Type": "application/json", ...(background ? { "X-Background": "1" } : {}), ...(rest.headers || {}) },
    });
    if (res.status === 401) { goneQuiet(); throw new Error("signed out"); }
    return res.json();
  }

  // Signed out or session over: back to a plain puzzle page
  function goneQuiet() {
    me = null;
    latest = null;
    pad.hidden = true;
    input.value = "";
    note.textContent = "";
    star.hidden = true;
    star.classList.remove("has-news");
    $("bb-owl").classList.remove("has-news");
    courseUi(false);
    if (sock) { const s = sock; sock = null; try { s.close(); } catch {} }
  }

  // ---- Course code: sign in / sign out ----
  const courseForm = $("bb-course-form"), courseOn = $("bb-course-on"), courseCode = $("bb-course-code"), courseMsg = $("bb-course-msg");
  function courseUi(on) {
    courseForm.hidden = on;
    courseOn.hidden = !on;
    if (on) { courseCode.value = ""; courseMsg.textContent = ""; }
  }
  courseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = courseCode.value.trim();
    if (!code) { courseCode.focus(); return; }
    courseMsg.textContent = "";
    try {
      const r = await fetch("/api/course/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await r.json().catch(() => ({}));
      if (!d.success) { courseMsg.textContent = d.message || "That course code wasn't found."; return; }
      courseCode.blur();
      start();
    } catch {
      courseMsg.textContent = "Couldn't connect. Try again.";
    }
  });
  courseCode.addEventListener("input", () => { courseMsg.textContent = ""; });

  // SIGN OUT: one tap, instantly. Message gone, pad closed and emptied, signed out.
  function signOut() {
    stopAutoHide();
    document.body.classList.add("dd-instant");
    revealed = false;
    finishCleanup();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    goneQuiet();
    fetch("/api/logout", { method: "POST" }).catch(() => {});
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("dd-instant")));
  }
  $("bb-signout").addEventListener("click", signOut);

  // Doing puzzles counts as activity, so the session doesn't time out (at most once a minute)
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

  const quick = (window.QUICK_MESSAGES && window.QUICK_MESSAGES.starterFavorites) || ["👋 Hi!", "✅ Yes", "❌ No", "👍 OK"];
  $("scratch-chips").innerHTML = quick.map((t) => `<button type="button" class="scratch-chip">${esc(t)}</button>`).join("");
  $("scratch-chips").addEventListener("click", (e) => {
    const b = e.target.closest(".scratch-chip");
    if (!b) return;
    input.value = input.value ? `${input.value} ${b.textContent}` : b.textContent;
    input.focus();
  });
  // ✓ = send (if there's anything written) and the sticky note disappears right away, every time
  $("scratch-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = input.value.trim();
    const recipient = to.value;
    pad.hidden = true;
    input.value = "";
    note.textContent = "";
    input.blur();
    if (!me || !recipient || !content) return;
    try {
      await api("/api/messages", { method: "POST", body: JSON.stringify({ recipient, content, channel: "dead_drop" }) });
      // a quiet "sent": the footer star twinkles once
      star.classList.remove("sent"); void star.offsetWidth; star.classList.add("sent");
    } catch {
      // didn't send: bring the note back with the words still on it
      input.value = content;
      note.textContent = "didn't save, try again";
      pad.hidden = false;
    }
  });

  // ---- IN: the reveal ----
  // One problem on screen quietly morphs into the newest message (same card, same font),
  // then morphs back. Nothing else on the page moves.
  const graphemes = (str) => (window.Intl && Intl.Segmenter
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(str), (s) => s.segment)
    : Array.from(str));
  const NOISE = "abcdefghijklmnopqrstuvwxyz0123456789+-×÷=?";
  const MORPH_MS = 420;
  const owl = $("bb-owl");
  let revealed = false;
  let morph = null; // { el, original, timer }

  // the problem to use: always the same number on the page (SECRET_PROBLEM)
  function pickCard() {
    const cards = document.querySelectorAll(".bb-page:not([hidden]) .bb-card");
    return (cards[SECRET_PROBLEM - 1] || cards[0])?.querySelector(".bb-q") || null;
  }

  // scramble from what's there into `to`, settling left to right
  function morphText(el, to, done) {
    clearInterval(morph?.timer);
    const target = graphemes(to);
    const start = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / MORPH_MS);
      const settled = Math.floor(t * target.length);
      el.textContent = target.map((c, i) =>
        i < settled || c === " " ? c : NOISE[Math.floor(Math.random() * NOISE.length)]).join("");
      if (t >= 1) { clearInterval(morph.timer); el.textContent = to; done && done(); }
    };
    morph.timer = setInterval(tick, 30);
    tick();
  }

  // put the problem back right now (emergencies, sign out, new page)
  function finishCleanup() {
    if (!morph) return;
    clearInterval(morph.timer);
    morph.el.textContent = morph.original;
    morph.el.classList.remove("is-morphed");
    morph = null;
    owl.classList.remove("is-live");
  }

  function reveal() {
    if (!me || !latest || revealed) return;
    finishCleanup();
    const el = pickCard();
    if (!el) return;
    revealed = true;
    morph = { el, original: el.textContent, timer: null };
    el.classList.add("is-morphed");
    morphText(el, `${latest.sender}: ${latest.content}`);

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
    owl.classList.remove("is-live");
    const m = morph;
    if (m) morphText(m.el, m.original, () => { if (morph === m) { m.el.classList.remove("is-morphed"); morph = null; } });
    // a self-destructing message burns once it's been read here
    if (latest && latest.self_destruct) {
      const id = latest.id;
      latest = null;
      api(`/api/messages/${id}/burn`, { method: "POST", background: true }).then(refreshLatest).catch(() => {});
    }
  }

  // The owl, two ways (the Director switches Eye-gaze mode on per agent):
  //   NORMAL:   press and HOLD it; the problem shows the message while held, and changes back on release.
  //   EYE GAZE: one click (a dwell click) shows it and leaves it up. Resting your eyes on the
  //             message does NOTHING (reading = dwelling). Click the owl again to change it back,
  //             or it changes back on its own after a few seconds.
  let eyeGaze = false;
  let holding = false, autoHide = null;
  const stopAutoHide = () => { clearTimeout(autoHide); autoHide = null; holding = false; };
  // how long the message stays up before changing back on its own
  const readingMs = () => 9000;
  owl.addEventListener("pointerdown", (e) => {
    if (!me) return;
    e.preventDefault();
    if (revealed) { stopAutoHide(); unreveal(); return; }
    if (!latest) return;
    reveal();
    if (!revealed) return;
    if (eyeGaze) {
      owl.classList.add("is-live");
      autoHide = setTimeout(() => { stopAutoHide(); unreveal(); }, readingMs());
    } else holding = true;
  });
  owl.addEventListener("contextmenu", (e) => e.preventDefault());
  ["pointerup", "pointercancel"].forEach((ev) => window.addEventListener(ev, () => {
    if (holding) { holding = false; unreveal(); } // let go: fly home
  }));
  window.addEventListener("blur", () => { stopAutoHide(); unreveal(); });
  // The ` key by its position on the keyboard (some Windows layouts treat ` as a
  // "dead key" for accents, so the typed character isn't reported, but the key is)
  const isRevealKey = (e) => e.code === "Backquote" || e.key === "`";
  // ...or hold the ` key (top-left of the keyboard), unless typing an answer
  window.addEventListener("keydown", (e) => {
    if (!isRevealKey(e) || e.repeat || e.target.closest?.("input, textarea, select")) return;
    e.preventDefault();
    if (revealed) return;
    reveal();
  });
  window.addEventListener("keyup", (e) => { if (isRevealKey(e)) { stopAutoHide(); unreveal(); } });

  // ---- EMERGENCY: Next Page ----
  // Instantly: the message vanishes, the scratch pad closes and empties,
  // and the waiting page appears, as if he just moved on to the next worksheet.
  function emergencyNext() {
    stopAutoHide();
    document.body.classList.add("dd-instant"); // no fades, no flying
    revealed = false;
    finishCleanup();
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
  // Holding the owl on a touchscreen: a tap anywhere with another finger = emergency.
  // (Not in Eye-gaze mode: there, resting the eyes on the message must never do anything.)
  window.addEventListener("pointerdown", (e) => {
    if (revealed && !eyeGaze && !e.target.closest("#bb-owl")) emergencyNext();
  });

  // Live news while signed in
  function connect() {
    if (!me || sock) return;
    const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`);
    sock = ws;
    ws.addEventListener("message", (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === "auth-required") { goneQuiet(); return; }
      if (msg.type === "new-message") { refreshLatest(); refreshNews(); }
    });
    ws.addEventListener("close", () => {
      if (sock !== ws) return; // signed out on purpose
      sock = null;
      if (me) setTimeout(connect, 3000);
    });
  }

  // Signed in? (quietly; a visitor just sees a puzzle page)
  function start() {
    return fetch("/api/me", { headers: { "X-Background": "1" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.agent) { goneQuiet(); return; }
        me = d.agent.agent_name;
        eyeGaze = !!d.agent.eye_gaze;
        star.hidden = false;
        courseUi(true);
        refreshNews();
        refreshLatest();
        connect();
      })
      .catch(() => {});
  }
  start();
})();
