// =========================================================
// Phantom Black Ops - server
//   - Logins: tap your face + 4-digit PIN (Director uses a password)
//   - New agents sign up, the Director approves them
//   - Every request checks WHO is asking (signed login cookie)
//   - Sessions end after 10 min of inactivity, when the browser closes, or after 12 h
//   - Every Locate Agent lookup is recorded in location_checks
//   - Secure Comms (chats), Locate Agent (map), video call signaling
// Settings (database password etc.) live in the .env file, not here.
// =========================================================
const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const WebSocket = require("ws");
const config = require("./config");

const app = express();
app.set("trust proxy", 1); // so https is detected correctly behind nginx on EC2
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------
// Database (a pool reconnects by itself if MySQL restarts)
// ---------------------------------------------------------
const pool = mysql.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});
const db = pool.promise();
const q = async (sql, params = []) => (await db.query(sql, params))[0];

// ---------------------------------------------------------
// Database upgrades: only ADD things, never delete. Safe to run every start.
// ---------------------------------------------------------
async function hasColumn(table, column) {
  const rows = await q(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].n > 0;
}
async function addColumn(table, column, ddl, afterAdd) {
  if (await hasColumn(table, column)) return;
  await q(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  console.log(`✅ Added ${table}.${column}`);
  if (afterAdd) await afterAdd();
}

async function upgradeDatabase() {
  // Unread badges (old messages count as already read)
  await addColumn("messages", "read_at", "DATETIME NULL", () =>
    q("UPDATE messages SET read_at = created_at WHERE read_at IS NULL"));

  // Logins
  await addColumn("agents", "pin_hash", "VARCHAR(255) NULL");
  await addColumn("agents", "password_hash", "VARCHAR(255) NULL");
  await addColumn("agents", "status", "VARCHAR(20) NOT NULL DEFAULT 'active'"); // existing agents stay active
  await addColumn("agents", "is_director", "TINYINT NOT NULL DEFAULT 0");

  // Scramble any old plain-text passwords, then wipe the readable copy
  const legacy = await q("SELECT agent_name, password FROM agents WHERE password_hash IS NULL AND password IS NOT NULL AND password <> ''");
  for (const a of legacy) {
    await q("UPDATE agents SET password_hash = ?, password = '' WHERE agent_name = ?", [hashSecret(a.password), a.agent_name]);
  }
  if (legacy.length) console.log(`🔒 Secured ${legacy.length} old password(s)`);

  // Who is the Director? (set DIRECTOR=YourAgentName in .env)
  if (config.DIRECTOR) {
    const r = await q("UPDATE agents SET is_director = 1, status = 'active' WHERE agent_name = ?", [config.DIRECTOR]);
    if (!r.affectedRows) console.warn(`⚠️  DIRECTOR "${config.DIRECTOR}" in .env doesn't match any agent name`);
  } else {
    console.warn("⚠️  No DIRECTOR set in .env - nobody can approve new agents yet");
  }

  // Director Dark Mode: Locate shows a frozen position instead of the real one
  await addColumn("agents", "dark_mode", "TINYINT NOT NULL DEFAULT 0");
  await addColumn("agents", "dark_lat", "DOUBLE NULL");
  await addColumn("agents", "dark_lng", "DOUBLE NULL");
  await addColumn("agents", "dark_accuracy", "DOUBLE NULL");

  // Locate Agent: a record of every lookup (who looked up whom, where both were)
  await q(`
    CREATE TABLE IF NOT EXISTS location_checks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      checked_at DATETIME NOT NULL,
      checker VARCHAR(100) NOT NULL,
      target VARCHAR(100) NOT NULL,
      status VARCHAR(10) NOT NULL,
      checker_lat DOUBLE NULL,
      checker_lng DOUBLE NULL,
      target_lat DOUBLE NULL,
      target_lng DOUBLE NULL,
      target_seen_at DATETIME NULL,
      target_age_seconds INT NULL
    )`);

  // Locate Agent
  await q(`
    CREATE TABLE IF NOT EXISTS agent_locations (
      agent_name VARCHAR(100) NOT NULL PRIMARY KEY,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      accuracy DOUBLE NULL,
      updated_at DATETIME NOT NULL
    )`);
}

// ---------------------------------------------------------
// Secrets: PINs and passwords are stored scrambled (scrypt)
// ---------------------------------------------------------
function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(secret), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}
function checkSecret(secret, stored) {
  const [kind, salt, hash] = String(stored || "").split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const test = crypto.scryptSync(String(secret), salt, 64);
  const real = Buffer.from(hash, "hex");
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}
const isPin = (p) => /^\d{4}$/.test(String(p || ""));
const cleanName = (s) => String(s || "").trim().replace(/\s+/g, " ");
const validName = (s) => /^[\p{L}\p{N} ._'-]{2,30}$/u.test(s);
const sameName = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

// ---------------------------------------------------------
// Login cookie: "agent name + when logged in + expiry", signed so it can't be faked
//   - expires after IDLE_MINUTES with no activity (each real request pushes it forward)
//   - hard limit of MAX_HOURS after login, however active
//   - no Max-Age, so the browser drops it when it closes
// ---------------------------------------------------------
const COOKIE = "imf_session";
const IDLE_MINUTES = Number(process.env.IDLE_MINUTES) || 10; // env override is for testing
const MAX_HOURS = 12;

function makeToken(agentName, loginAt = Date.now()) {
  const payload = { a: agentName, iat: loginAt, exp: Date.now() + IDLE_MINUTES * 60000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", config.SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function readToken(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const good = crypto.createHmac("sha256", config.SESSION_SECRET).update(body).digest("base64url");
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    const now = Date.now();
    if (!data.a || !(data.exp > now) || !(now - data.iat < MAX_HOURS * 3600000)) return null;
    return { name: data.a, iat: data.iat };
  } catch {
    return null;
  }
}
function getCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
function setLoginCookie(req, res, agentName, loginAt) {
  res.cookie(COOKIE, makeToken(agentName, loginAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure, // true once on https
    path: "/",          // no maxAge: a "session cookie" that ends when the browser closes
  });
}

// Look up the logged-in agent (cached briefly so it's fast)
const agentCache = new Map();
async function agentFromRequest(req) {
  const token = readToken(getCookie(req, COOKIE));
  if (!token) return null;
  const name = token.name;
  const hit = agentCache.get(name);
  if (hit && Date.now() - hit.t < 30000) return hit.agent && { ...hit.agent, loginAt: token.iat };
  const rows = await q("SELECT agent_name, status, is_director FROM agents WHERE agent_name = ?", [name]);
  const agent = rows[0] && rows[0].status === "active"
    ? { name: rows[0].agent_name, isDirector: !!rows[0].is_director }
    : null;
  agentCache.set(name, { agent, t: Date.now() });
  return agent && { ...agent, loginAt: token.iat };
}
const forgetAgent = (name) => agentCache.delete(name);

// Route guards
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
  console.error("💥", req.method, req.path, err);
  res.status(500).json({ success: false, message: "Server error" });
});
const requireAgent = wrap(async (req, res, next) => {
  const agent = await agentFromRequest(req);
  if (!agent) {
    res.clearCookie(COOKIE, { path: "/" });
    return res.status(401).json({ success: false, message: "Please log in" });
  }
  req.agent = agent;
  // Real activity pushes the 10-minute idle timer forward. Automatic background
  // requests (location updates, refresh checks) send X-IMF-Background and don't.
  if (req.get("X-IMF-Background") !== "1") setLoginCookie(req, res, agent.name, agent.loginAt);
  next();
});
const requireDirector = (req, res, next) =>
  req.agent?.isDirector ? next() : res.status(403).json({ success: false, message: "Director only" });

// Wrong-PIN lockout: 5 misses = 5 minute timeout for that agent
const misses = new Map();
function lockedOut(name) {
  const m = misses.get(name.toLowerCase());
  return m && m.until > Date.now() ? Math.ceil((m.until - Date.now()) / 60000) : 0;
}
function recordMiss(name) {
  const key = name.toLowerCase();
  const m = misses.get(key) || { n: 0, until: 0 };
  m.n += 1;
  if (m.n >= 5) { m.until = Date.now() + 5 * 60000; m.n = 0; }
  misses.set(key, m);
}

// ---------------------------------------------------------
// Pages
// ---------------------------------------------------------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/dossier.html", (req, res) => res.sendFile(path.join(__dirname, "public", "dossier.html")));

// ---------------------------------------------------------
// Login / sign-up
// ---------------------------------------------------------

// Step 1: which kind of login does this agent use?
// (Unknown names get "pin" too, so this can't be used to discover who's in the app.)
app.post("/api/login/start", wrap(async (req, res) => {
  const name = cleanName(req.body?.agent_name);
  const rows = name ? await q("SELECT agent_name, pin_hash, is_director FROM agents WHERE agent_name = ?", [name]) : [];
  const a = rows[0];
  let method = "pin";
  if (a && a.is_director) method = "password";
  else if (a && !a.pin_hash) method = "legacy"; // old account: old password once, then pick a PIN
  res.json({ success: true, method, agent_name: a ? a.agent_name : name });
}));

// Step 2: PIN (agents) or password (Director / first login on an old account)
app.post("/api/login", wrap(async (req, res) => {
  const name = cleanName(req.body?.agent_name);
  const { pin, password } = req.body || {};
  const fail = (message, status = 401) => res.status(status).json({ success: false, message });
  if (!name) return fail("Pick an agent");

  const wait = lockedOut(name);
  if (wait) return fail(`Too many tries. Wait ${wait} minute${wait > 1 ? "s" : ""}.`, 429);

  const rows = await q("SELECT agent_name, pin_hash, password_hash, status, is_director FROM agents WHERE agent_name = ?", [name]);
  const a = rows[0];
  let ok = false;
  if (a && pin !== undefined && a.pin_hash && !a.is_director) ok = checkSecret(pin, a.pin_hash);
  if (a && password !== undefined && (a.is_director || !a.pin_hash)) ok = checkSecret(password, a.password_hash);

  if (!ok) {
    recordMiss(name);
    console.log("❌ Failed login:", name);
    return fail(pin !== undefined ? "Wrong PIN" : "Wrong password");
  }
  misses.delete(name.toLowerCase());
  if (a.status === "pending") return fail("Waiting for the Director to approve you 🕵️", 403);
  if (a.status !== "active") return fail("This agent is switched off. Ask the Director.", 403);

  setLoginCookie(req, res, a.agent_name, Date.now());
  console.log("✅ Login:", a.agent_name);
  res.json({
    success: true,
    agent: { agent_name: a.agent_name, is_director: !!a.is_director },
    needsPin: !a.is_director && !a.pin_hash,
  });
}));

app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ success: true });
});

// Who am I? (the dossier asks this first)
app.get("/api/me", requireAgent, wrap(async (req, res) => {
  const dark = req.agent.isDirector ? await darkSpot(req.agent.name) : null;
  res.json({
    success: true,
    agent: { agent_name: req.agent.name, is_director: req.agent.isDirector, dark_mode: !!dark },
    session: { idleMinutes: IDLE_MINUTES, maxHours: MAX_HOURS },
  });
}));

// Choose / change my PIN
app.post("/api/me/pin", requireAgent, wrap(async (req, res) => {
  const { pin } = req.body || {};
  if (!isPin(pin)) return res.status(400).json({ success: false, message: "PIN must be 4 numbers" });
  await q("UPDATE agents SET pin_hash = ? WHERE agent_name = ?", [hashSecret(pin), req.agent.name]);
  res.json({ success: true });
}));

// New agent asks to join -> waits for the Director
app.post("/api/register", wrap(async (req, res) => {
  const name = cleanName(req.body?.agent_name);
  const { pin, email, bio } = req.body || {};
  if (!validName(name)) return res.status(400).json({ success: false, message: "Code name: 2-30 letters or numbers" });
  if (!isPin(pin)) return res.status(400).json({ success: false, message: "PIN must be 4 numbers" });

  const taken = await q("SELECT 1 FROM agents WHERE LOWER(agent_name) = LOWER(?)", [name]);
  if (taken.length) return res.status(409).json({ success: false, message: "That code name is taken" });

  await q(
    `INSERT INTO agents (agent_name, email, password, bio, profile_pic, clearance_level, location, pin_hash, status)
     VALUES (?, ?, '', ?, 'default.png', 1, 'Unknown', ?, 'pending')`,
    [name, String(email || "").trim(), String(bio || "").trim().slice(0, 500), hashSecret(pin)]
  );
  console.log("📝 New agent request:", name);
  notifyDirectors({ type: "agent-request", agent: name });
  res.json({ success: true, message: "Request sent! The Director has to approve you before you can log in." });
}));

// ---------------------------------------------------------
// Agents
// ---------------------------------------------------------
app.get("/api/agents", requireAgent, wrap(async (req, res) => {
  const rows = await q("SELECT agent_name FROM agents WHERE status = 'active' ORDER BY agent_name ASC");
  res.json({ success: true, agents: rows.map((r) => r.agent_name) });
}));

async function activeAgentNamed(name) {
  const rows = await q("SELECT agent_name FROM agents WHERE agent_name = ? AND status = 'active'", [cleanName(name)]);
  return rows[0]?.agent_name || null;
}

// ---------------------------------------------------------
// Secure Comms (always as the logged-in agent)
// ---------------------------------------------------------
app.post("/api/messages", requireAgent, wrap(async (req, res) => {
  const content = String(req.body?.content || "").trim();
  const recipient = await activeAgentNamed(req.body?.recipient);
  if (!recipient || !content) return res.status(400).json({ success: false, message: "Missing recipient or message" });
  if (content.length > 2000) return res.status(400).json({ success: false, message: "Message too long" });

  const result = await q("INSERT INTO messages (sender, recipient, content) VALUES (?, ?, ?)", [req.agent.name, recipient, content]);
  notifyAgent(recipient, { type: "new-message", from: req.agent.name });
  res.json({ success: true, messageId: result.insertId });
}));

// Everyone I've chatted with, newest first
app.get("/api/conversations", requireAgent, wrap(async (req, res) => {
  const me = req.agent.name;
  const rows = await q(
    `SELECT sender, recipient, content, created_at, read_at FROM messages
     WHERE sender = ? OR recipient = ? ORDER BY created_at ASC`, [me, me]);

  const byPartner = new Map();
  for (const m of rows) {
    const fromMe = sameName(m.sender, me);
    const partner = String(fromMe ? m.recipient : m.sender).trim();
    const key = partner.toLowerCase();
    if (!key || key === me.toLowerCase()) continue;
    const c = byPartner.get(key) || { agent: partner, unread: 0 };
    c.lastMessage = m.content;
    c.lastFromMe = fromMe;
    c.lastAt = m.created_at;
    if (!fromMe && !m.read_at) c.unread += 1;
    byPartner.set(key, c);
  }
  const conversations = [...byPartner.values()].sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  res.json({ success: true, conversations });
}));

// One chat, oldest first
app.get("/api/thread/:other", requireAgent, wrap(async (req, res) => {
  const me = req.agent.name, other = req.params.other;
  const rows = await q(
    `SELECT sender, recipient, content, created_at, read_at FROM messages
     WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
     ORDER BY created_at ASC`, [me, other, other, me]);
  res.json({ success: true, messages: rows.map((m) => ({ ...m, fromMe: sameName(m.sender, me) })) });
}));

app.post("/api/thread/:other/read", requireAgent, wrap(async (req, res) => {
  await q("UPDATE messages SET read_at = ? WHERE sender = ? AND recipient = ? AND read_at IS NULL",
    [new Date(), req.params.other, req.agent.name]);
  res.json({ success: true });
}));

// ---------------------------------------------------------
// Locate Agent (shared while the app is open)
// ---------------------------------------------------------

// Director Dark Mode: while it's on, the Director's real position is never stored
// or shown. Everyone sees the frozen spot from the moment Dark Mode was switched on,
// always looking freshly updated.
async function darkSpot(name) {
  const rows = await q(
    "SELECT dark_lat, dark_lng, dark_accuracy FROM agents WHERE agent_name = ? AND dark_mode = 1 AND is_director = 1 AND dark_lat IS NOT NULL",
    [name]);
  return rows[0] ? { lat: rows[0].dark_lat, lng: rows[0].dark_lng, accuracy: rows[0].dark_accuracy } : null;
}
async function darkAgents() {
  const rows = await q(
    "SELECT agent_name, dark_lat, dark_lng, dark_accuracy FROM agents WHERE dark_mode = 1 AND is_director = 1 AND dark_lat IS NOT NULL");
  return new Map(rows.map((r) => [r.agent_name.toLowerCase(), { lat: r.dark_lat, lng: r.dark_lng, accuracy: r.dark_accuracy }]));
}
async function saveLocation(agent, la, ln, acc, now) {
  const r = await q("UPDATE agent_locations SET lat = ?, lng = ?, accuracy = ?, updated_at = ? WHERE agent_name = ?", [la, ln, acc, now, agent]);
  if (!r.affectedRows) {
    await q("INSERT INTO agent_locations (agent_name, lat, lng, accuracy, updated_at) VALUES (?, ?, ?, ?, ?)", [agent, la, ln, acc, now]);
  }
  broadcast({ type: "location", agent, lat: la, lng: ln, accuracy: acc, updated_at: now });
}
app.post("/api/location", requireAgent, wrap(async (req, res) => {
  const la = Number(req.body?.lat), ln = Number(req.body?.lng), accRaw = Number(req.body?.accuracy);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
    return res.status(400).json({ success: false, message: "Bad location" });
  }
  const acc = Number.isFinite(accRaw) ? accRaw : null;
  const now = new Date();
  const agent = req.agent.name;
  const dark = req.agent.isDirector ? await darkSpot(agent) : null;
  if (dark) await saveLocation(agent, dark.lat, dark.lng, dark.accuracy, now); // real fix is thrown away
  else await saveLocation(agent, la, ln, acc, now);
  res.json({ success: true });
}));

// Locate one agent, and record the lookup in location_checks
const LIVE_SECONDS = 5 * 60;
app.post("/api/locate", requireAgent, wrap(async (req, res) => {
  const target = await activeAgentNamed(req.body?.target);
  if (!target) return res.status(404).json({ success: false, message: "No such agent" });
  const checker = req.agent.name;
  const now = new Date();

  const rows = await q("SELECT agent_name, lat, lng, accuracy, updated_at FROM agent_locations WHERE agent_name IN (?, ?)", [checker, target]);
  const find = (n) => rows.find((r) => sameName(r.agent_name, n)) || null;
  const dark = await darkAgents();
  const mask = (r) => {
    const d = r && dark.get(r.agent_name.toLowerCase());
    return d ? { ...r, ...d, updated_at: now } : r;
  };
  let mine = mask(find(checker));
  let theirs = mask(find(target));
  const targetDark = dark.get(String(target).toLowerCase());
  if (!theirs && targetDark) theirs = { agent_name: target, ...targetDark, updated_at: now };

  const ageSeconds = theirs ? Math.max(0, Math.round((now - new Date(theirs.updated_at)) / 1000)) : null;
  const status = !theirs ? "off_grid" : ageSeconds <= LIVE_SECONDS ? "live" : "stale";

  if (!sameName(checker, target)) {
    await q(
      `INSERT INTO location_checks
         (checked_at, checker, target, status, checker_lat, checker_lng, target_lat, target_lng, target_seen_at, target_age_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [now, checker, target, status, mine?.lat ?? null, mine?.lng ?? null,
        theirs?.lat ?? null, theirs?.lng ?? null, theirs?.updated_at ?? null, ageSeconds]
    );
  }
  res.json({ success: true, status, ageSeconds, location: theirs });
}));

app.get("/api/locations", requireAgent, wrap(async (req, res) => {
  const rows = await q(
    `SELECT l.agent_name, l.lat, l.lng, l.accuracy, l.updated_at
     FROM agent_locations l JOIN agents a ON a.agent_name = l.agent_name
     WHERE a.status = 'active'`);
  const dark = await darkAgents();
  const now = new Date();
  res.json({
    success: true,
    locations: rows.map((r) => {
      const d = dark.get(r.agent_name.toLowerCase());
      return d ? { ...r, ...d, updated_at: now } : r;
    }),
  });
}));

// ---------------------------------------------------------
// Director Console
// ---------------------------------------------------------
app.get("/api/director/agents", requireAgent, requireDirector, wrap(async (req, res) => {
  const rows = await q("SELECT agent_name, email, bio, status, is_director, (pin_hash IS NOT NULL) AS has_pin FROM agents ORDER BY status DESC, agent_name ASC");
  res.json({ success: true, agents: rows.map((r) => ({ ...r, is_director: !!r.is_director, has_pin: !!r.has_pin })) });
}));

// Dark Mode on/off. The very first time it's switched on, the Director's location
// at that moment becomes the Dark Mode spot for good. Every later switch-on reuses
// that same spot; switching off never forgets it.
app.post("/api/director/dark-mode", requireAgent, requireDirector, wrap(async (req, res) => {
  const name = req.agent.name;
  const now = new Date();
  if (!req.body?.on) {
    await q("UPDATE agents SET dark_mode = 0 WHERE agent_name = ?", [name]);
    const la = Number(req.body?.lat), ln = Number(req.body?.lng), acc = Number(req.body?.accuracy);
    if (Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) {
      await saveLocation(name, la, ln, Number.isFinite(acc) ? acc : null, now); // back to the real spot right away
    }
    return res.json({ success: true, darkMode: false });
  }
  const saved = (await q("SELECT dark_lat, dark_lng, dark_accuracy FROM agents WHERE agent_name = ? AND dark_lat IS NOT NULL", [name]))[0];
  if (saved) {
    await q("UPDATE agents SET dark_mode = 1 WHERE agent_name = ?", [name]);
    await saveLocation(name, saved.dark_lat, saved.dark_lng, saved.dark_accuracy, now);
    return res.json({ success: true, darkMode: true, lat: saved.dark_lat, lng: saved.dark_lng });
  }
  let la = Number(req.body?.lat), ln = Number(req.body?.lng), acc = Number(req.body?.accuracy);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
    const rows = await q("SELECT lat, lng, accuracy FROM agent_locations WHERE agent_name = ?", [name]);
    if (!rows[0]) return res.status(400).json({ success: false, message: "Couldn't get your location yet. Allow location and try again." });
    ({ lat: la, lng: ln, accuracy: acc } = rows[0]);
  }
  acc = Number.isFinite(Number(acc)) ? Number(acc) : null;
  await q("UPDATE agents SET dark_mode = 1, dark_lat = ?, dark_lng = ?, dark_accuracy = ? WHERE agent_name = ?", [la, ln, acc, name]);
  await saveLocation(name, la, ln, acc, now);
  res.json({ success: true, darkMode: true, lat: la, lng: ln });
}));

// Reset the Dark Mode spot to where the Director is right now (needs a fresh GPS fix,
// since while dark the stored location is the old spot). Applies at once if Dark Mode is on.
app.post("/api/director/dark-mode/reset", requireAgent, requireDirector, wrap(async (req, res) => {
  const name = req.agent.name;
  const la = Number(req.body?.lat), ln = Number(req.body?.lng), accRaw = Number(req.body?.accuracy);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
    return res.status(400).json({ success: false, message: "Couldn't get your location right now. Allow location and try again." });
  }
  const acc = Number.isFinite(accRaw) ? accRaw : null;
  await q("UPDATE agents SET dark_lat = ?, dark_lng = ?, dark_accuracy = ? WHERE agent_name = ?", [la, ln, acc, name]);
  if (await darkSpot(name)) await saveLocation(name, la, ln, acc, new Date());
  res.json({ success: true, lat: la, lng: ln });
}));

// Most recent Locate Agent lookups (newest first)
app.get("/api/director/location-checks", requireAgent, requireDirector, wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200);
  const rows = await q(
    `SELECT id, checked_at, checker, target, status, checker_lat, checker_lng,
            target_lat, target_lng, target_seen_at, target_age_seconds
     FROM location_checks ORDER BY id DESC LIMIT ${limit}`);
  res.json({ success: true, checks: rows });
}));

app.post("/api/director/agents/:name/:action", requireAgent, requireDirector, wrap(async (req, res) => {
  const { name, action } = req.params;
  const rows = await q("SELECT agent_name, is_director FROM agents WHERE agent_name = ?", [name]);
  const target = rows[0];
  if (!target) return res.status(404).json({ success: false, message: "No such agent" });
  if (target.is_director && action !== "reset-pin") {
    return res.status(400).json({ success: false, message: "Can't change the Director's own account here" });
  }

  if (action === "approve" || action === "activate") {
    await q("UPDATE agents SET status = 'active' WHERE agent_name = ?", [name]);
  } else if (action === "deactivate") {
    await q("UPDATE agents SET status = 'disabled' WHERE agent_name = ?", [name]);
  } else if (action === "reject") {
    await q("DELETE FROM agents WHERE agent_name = ? AND status = 'pending'", [name]);
  } else if (action === "reset-pin") {
    const { pin } = req.body || {};
    if (!isPin(pin)) return res.status(400).json({ success: false, message: "PIN must be 4 numbers" });
    await q("UPDATE agents SET pin_hash = ? WHERE agent_name = ?", [hashSecret(pin), name]);
    misses.delete(name.toLowerCase());
  } else {
    return res.status(400).json({ success: false, message: "Unknown action" });
  }
  forgetAgent(target.agent_name);
  console.log(`🎖️  Director ${req.agent.name}: ${action} ${target.agent_name}`);
  res.json({ success: true });
}));

// ---------------------------------------------------------
// Start (HTTP + WebSocket on the same port)
// ---------------------------------------------------------
const server = http.createServer(app);

upgradeDatabase()
  .then(() => console.log("✅ Connected to MySQL Database"))
  .catch((err) => console.error("❌ Database setup problem:", err.message))
  .finally(() => {
    server.listen(config.PORT, () => console.log(`🚀 Server running at http://localhost:${config.PORT}`));
  });

// ===========================
// WebSocket: live updates + video call signaling
// Who you are comes from your login cookie, never from the message.
// ===========================
const wss = new WebSocket.Server({ server });
const clients = new Map(); // normalized agent name -> Set of open connections (tablet + PC)
const norm = (s) => String(s || "").trim().toLowerCase();

function safeSend(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}
function notifyAgent(agent, obj) {
  for (const ws of clients.get(norm(agent)) || []) safeSend(ws, obj);
}
function broadcast(obj) {
  for (const set of clients.values()) for (const ws of set) safeSend(ws, obj);
}
function notifyDirectors(obj) {
  for (const set of clients.values()) for (const ws of set) if (ws.isDirector) safeSend(ws, obj);
}

wss.on("connection", async (ws, req) => {
  let agent = null;
  try {
    agent = await agentFromRequest(req);
  } catch {}
  if (!agent) {
    safeSend(ws, { type: "auth-required" });
    return ws.close();
  }
  const key = norm(agent.name);
  ws.isDirector = agent.isDirector;
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(ws);
  safeSend(ws, { type: "registered", agent: agent.name });

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === "register") return; // identity already known from the cookie

    // Route call signaling to the target agent, stamped with the REAL sender
    const to = norm(msg.to);
    if (!to) return;
    const targets = clients.get(to);
    if (targets && targets.size) {
      for (const t of targets) safeSend(t, { ...msg, to, from: key });
    } else {
      safeSend(ws, { type: "target-offline", to });
    }
  });

  ws.on("close", () => {
    const set = clients.get(key);
    if (!set) return;
    set.delete(ws);
    if (!set.size) clients.delete(key);
  });
});
