// Reads settings from the .env file next to this one (no extra packages needed).
// Copy .env.example to .env and fill it in. Never share .env - it has passwords.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const envPath = path.join(__dirname, ".env");
const fileVals = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) fileVals[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} else {
  console.warn("⚠️  No .env file found - copy .env.example to .env and fill it in");
}
const get = (k, d) => process.env[k] ?? fileVals[k] ?? d;

// The login-cookie signing key. Made automatically the first time and saved into .env,
// so logins survive server restarts.
let secret = get("SESSION_SECRET");
if (!secret) {
  secret = crypto.randomBytes(32).toString("hex");
  try {
    fs.appendFileSync(envPath, `\r\n# Made automatically - keeps agents logged in across restarts. Keep secret.\r\nSESSION_SECRET=${secret}\r\n`);
    console.log("🔑 Created SESSION_SECRET in .env");
  } catch (e) {
    console.warn("⚠️  Couldn't save SESSION_SECRET to .env; logins will reset when the server restarts");
  }
}

module.exports = {
  PORT: Number(get("PORT", 3000)),
  DB_HOST: get("DB_HOST", "localhost"),
  DB_USER: get("DB_USER", "root"),
  DB_PASSWORD: get("DB_PASSWORD", ""),
  DB_NAME: get("DB_NAME", "henrysimfdb"),
  DIRECTOR: get("DIRECTOR", ""),
  SESSION_SECRET: secret,
};
