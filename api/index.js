// AUTO-GENERATED from src/app.js by 'npm run bundle'. Do not edit by hand.

// src/app.js
import express from "express";
import cors from "cors";

// src/config.js
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var projectRoot = path.join(__dirname, "..");
var config = {
  port: Number(process.env.PORT) || 4e3,
  clientUrl: process.env.CLIENT_URL || "http://localhost:4000",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  // Neon / Vercel inject one of these. Falls back to the local Docker PG.
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || "postgres://postgres:dev@localhost:5433/fanhub",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  unlockPriceCents: Number(process.env.UNLOCK_PRICE_CENTS) || 500,
  // The frontend (index.html) lives at the project root in the Vercel layout.
  repoRoot: projectRoot,
  projectRoot
};
var stripeEnabled = Boolean(config.stripeSecretKey);

// src/auth.js
import jwt from "jsonwebtoken";

// src/db.js
import pg from "pg";
var { Pool } = pg;
var isLocal = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
var pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 5
});
async function get(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}
async function all(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows;
}
async function run(text, params = []) {
  const res = await pool.query(text, params);
  return { row: res.rows[0] || null, rowCount: res.rowCount };
}

// src/auth.js
function signToken(user) {
  return jwt.sign({ uid: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}
async function userFromToken(token) {
  try {
    const { uid } = jwt.verify(token, config.jwtSecret);
    return await get("SELECT id, email, display_name, created_at FROM users WHERE id = $1", [uid]);
  } catch {
    return null;
  }
}
function tokenFromReq(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return null;
}
async function attachUser(req, _res, next) {
  const token = tokenFromReq(req);
  req.user = token ? await userFromToken(token) : null;
  next();
}
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  next();
}

// src/routes/auth.js
import { Router } from "express";
import bcrypt from "bcryptjs";

// src/entitlements.js
var ALL_BOROUGHS = ["Brooklyn", "Manhattan", "Queens", "Bronx", "Staten Island"];
var FREE_BOROUGH = "Brooklyn";
async function grantBorough(userId, borough, source = "purchase") {
  await run(
    `INSERT INTO entitlements (user_id, borough, source) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, borough) DO NOTHING`,
    [userId, borough, source]
  );
}
async function activateSubscription(userId, { source = "purchase", stripeCustomerId = null, stripeSessionId = null } = {}) {
  for (const b of ALL_BOROUGHS) await grantBorough(userId, b, source);
  await run(
    `INSERT INTO subscriptions (user_id, status, stripe_customer_id, stripe_session_id, activated_at)
     VALUES ($1, 'active', $2, $3, now())
     ON CONFLICT (user_id) DO UPDATE SET
       status='active', stripe_customer_id=EXCLUDED.stripe_customer_id,
       stripe_session_id=EXCLUDED.stripe_session_id, activated_at=now()`,
    [userId, stripeCustomerId, stripeSessionId]
  );
}
async function getEntitlements(userId) {
  const rows = await all("SELECT borough FROM entitlements WHERE user_id = $1", [userId]);
  const sub = await get("SELECT status FROM subscriptions WHERE user_id = $1", [userId]);
  return {
    boroughs: rows.map((r) => r.borough),
    subscriptionActive: sub?.status === "active"
  };
}
async function hasBorough(userId, borough) {
  if (!userId) return borough === FREE_BOROUGH;
  const row = await get("SELECT 1 FROM entitlements WHERE user_id = $1 AND borough = $2", [userId, borough]);
  return Boolean(row);
}

// src/routes/auth.js
var router = Router();
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function publicUser(u) {
  return { id: u.id, email: u.email, displayName: u.display_name, createdAt: u.created_at };
}
router.post("/register", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const displayName = String(req.body.displayName || "").trim() || email.split("@")[0];
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Valid email required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const exists = await get("SELECT 1 FROM users WHERE email = $1", [email]);
  if (exists) return res.status(409).json({ error: "Email already registered" });
  const hash = bcrypt.hashSync(password, 10);
  const { row } = await run(
    "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING *",
    [email, hash, displayName]
  );
  await grantBorough(row.id, FREE_BOROUGH, "free");
  const token = signToken(row);
  res.status(201).json({ token, user: publicUser(row), entitlements: await getEntitlements(row.id) });
});
router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = await get("SELECT * FROM users WHERE email = $1", [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user), entitlements: await getEntitlements(user.id) });
});
router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user), entitlements: await getEntitlements(req.user.id) });
});
var auth_default = router;

// src/routes/events.js
import { Router as Router2 } from "express";

// src/reference.js
var countries = [
  { code: "US", name: "USA", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "AR", name: "Argentina", flag: "\u{1F1E6}\u{1F1F7}" },
  { code: "BR", name: "Brazil", flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "EN", name: "England", flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}" },
  { code: "ES", name: "Spain", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "FR", name: "France", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "DE", name: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "IT", name: "Italy", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "MX", name: "Mexico", flag: "\u{1F1F2}\u{1F1FD}" },
  { code: "PT", name: "Portugal", flag: "\u{1F1F5}\u{1F1F9}" },
  { code: "NL", name: "Netherlands", flag: "\u{1F1F3}\u{1F1F1}" },
  { code: "JP", name: "Japan", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "BE", name: "Belgium", flag: "\u{1F1E7}\u{1F1EA}" },
  { code: "HR", name: "Croatia", flag: "\u{1F1ED}\u{1F1F7}" },
  { code: "CH", name: "Switzerland", flag: "\u{1F1E8}\u{1F1ED}" },
  { code: "DK", name: "Denmark", flag: "\u{1F1E9}\u{1F1F0}" },
  { code: "SE", name: "Sweden", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "AT", name: "Austria", flag: "\u{1F1E6}\u{1F1F9}" },
  { code: "TR", name: "Turkey", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "PL", name: "Poland", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "AU", name: "Australia", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "CA", name: "Canada", flag: "\u{1F1E8}\u{1F1E6}" },
  { code: "KR", name: "South Korea", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "SA", name: "Saudi Arabia", flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "MA", name: "Morocco", flag: "\u{1F1F2}\u{1F1E6}" },
  { code: "SN", name: "Senegal", flag: "\u{1F1F8}\u{1F1F3}" },
  { code: "CM", name: "Cameroon", flag: "\u{1F1E8}\u{1F1F2}" },
  { code: "GH", name: "Ghana", flag: "\u{1F1EC}\u{1F1ED}" },
  { code: "NG", name: "Nigeria", flag: "\u{1F1F3}\u{1F1EC}" },
  { code: "CI", name: "C\xF4te d'Ivoire", flag: "\u{1F1E8}\u{1F1EE}" },
  { code: "IR", name: "Iran", flag: "\u{1F1EE}\u{1F1F7}" },
  { code: "QA", name: "Qatar", flag: "\u{1F1F6}\u{1F1E6}" },
  { code: "UY", name: "Uruguay", flag: "\u{1F1FA}\u{1F1FE}" },
  { code: "CO", name: "Colombia", flag: "\u{1F1E8}\u{1F1F4}" },
  { code: "CL", name: "Chile", flag: "\u{1F1E8}\u{1F1F1}" },
  { code: "PE", name: "Peru", flag: "\u{1F1F5}\u{1F1EA}" },
  { code: "EC", name: "Ecuador", flag: "\u{1F1EA}\u{1F1E8}" },
  { code: "CR", name: "Costa Rica", flag: "\u{1F1E8}\u{1F1F7}" },
  { code: "EG", name: "Egypt", flag: "\u{1F1EA}\u{1F1EC}" },
  { code: "NO", name: "Norway", flag: "\u{1F1F3}\u{1F1F4}" },
  { code: "IS", name: "Iceland", flag: "\u{1F1EE}\u{1F1F8}" },
  { code: "IE", name: "Ireland", flag: "\u{1F1EE}\u{1F1EA}" }
];
var nationNames = countries.map((c) => c.name);
function isWorldCupMatch(match) {
  if (!match) return false;
  return nationNames.some((n) => match.includes(n));
}

// src/routes/events.js
var router2 = Router2();
async function serialize(row, userId) {
  const reactionRows = await all(
    "SELECT emoji, COUNT(*)::int AS n FROM event_reactions WHERE event_id = $1 GROUP BY emoji",
    [row.id]
  );
  const reactions = reactionRows.reduce((acc, r) => (acc[r.emoji] = r.n, acc), {});
  const isSaved = userId ? Boolean(await get("SELECT 1 FROM saved_events WHERE user_id = $1 AND event_id = $2", [userId, row.id])) : false;
  return {
    id: row.id,
    sport: row.sport,
    country: row.country,
    match: row.match,
    venue: row.venue,
    vtype: row.vtype,
    neighborhood: row.neighborhood,
    borough: row.borough,
    distance: row.distance,
    time: row.time,
    perks: JSON.parse(row.perks || "[]"),
    live: Boolean(row.live),
    when: row.when_label,
    lat: row.lat,
    lng: row.lng,
    eventType: row.event_type,
    price: row.price,
    hostId: row.host_id,
    isWorldCup: isWorldCupMatch(row.match),
    locked: !await hasBorough(userId, row.borough),
    saved: isSaved,
    reactions
  };
}
router2.get("/", async (req, res) => {
  const { eventType, country, sport, borough, worldcup, q } = req.query;
  const where = [];
  const params = [];
  const add = (clause, val) => {
    params.push(val);
    where.push(clause.replace("?", "$" + params.length));
  };
  if (eventType) add("event_type = ?", eventType);
  if (country) add("country = ?", country);
  if (sport) add("sport = ?", sport);
  if (borough) add("borough = ?", borough);
  if (q) {
    const like = `%${q}%`;
    params.push(like);
    const p = "$" + params.length;
    where.push(`(match ILIKE ${p} OR venue ILIKE ${p} OR neighborhood ILIKE ${p})`);
  }
  const sql = `SELECT * FROM events ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY distance ASC`;
  let rows = await all(sql, params);
  if (worldcup === "true") rows = rows.filter((r) => isWorldCupMatch(r.match));
  else if (worldcup === "false") rows = rows.filter((r) => !isWorldCupMatch(r.match));
  res.json({ events: await Promise.all(rows.map((r) => serialize(r, req.user?.id))) });
});
router2.get("/:id", async (req, res) => {
  const row = await get("SELECT * FROM events WHERE id = $1", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Event not found" });
  res.json({ event: await serialize(row, req.user?.id) });
});
var EVENT_TYPES = /* @__PURE__ */ new Set(["watch-party", "parade", "pickup"]);
router2.post("/", requireAuth, async (req, res) => {
  const b = req.body || {};
  const required = ["sport", "match", "venue", "borough", "eventType"];
  for (const f of required) {
    if (!String(b[f] || "").trim()) return res.status(400).json({ error: `Missing field: ${f}` });
  }
  if (!EVENT_TYPES.has(b.eventType)) return res.status(400).json({ error: "Invalid eventType" });
  const { row } = await run(`
    INSERT INTO events (sport, country, match, venue, vtype, neighborhood, borough,
      distance, time, perks, live, when_label, lat, lng, event_type, price, host_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *
  `, [
    b.sport,
    b.country || null,
    b.match,
    b.venue,
    b.vtype || null,
    b.neighborhood || null,
    b.borough,
    Number(b.distance) || 0,
    b.time || null,
    JSON.stringify(Array.isArray(b.perks) ? b.perks : []),
    b.live ? 1 : 0,
    b.when || null,
    b.lat ?? null,
    b.lng ?? null,
    b.eventType,
    b.price || "Free",
    req.user.id
  ]);
  res.status(201).json({ event: await serialize(row, req.user.id) });
});
router2.post("/:id/react", requireAuth, async (req, res) => {
  const emoji = String(req.body.emoji || "").trim();
  if (!emoji) return res.status(400).json({ error: "emoji required" });
  const event = await get("SELECT id FROM events WHERE id = $1", [req.params.id]);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const existing = await get(
    "SELECT 1 FROM event_reactions WHERE user_id = $1 AND event_id = $2 AND emoji = $3",
    [req.user.id, req.params.id, emoji]
  );
  if (existing) {
    await run(
      "DELETE FROM event_reactions WHERE user_id = $1 AND event_id = $2 AND emoji = $3",
      [req.user.id, req.params.id, emoji]
    );
  } else {
    await run(
      "INSERT INTO event_reactions (user_id, event_id, emoji) VALUES ($1, $2, $3)",
      [req.user.id, req.params.id, emoji]
    );
  }
  const row = await get("SELECT * FROM events WHERE id = $1", [req.params.id]);
  res.json({ event: await serialize(row, req.user.id) });
});
var events_default = router2;

// src/routes/saved.js
import { Router as Router3 } from "express";
var router3 = Router3();
router3.use(requireAuth);
router3.get("/", async (req, res) => {
  const rows = await all(`
    SELECT e.* FROM saved_events s
    JOIN events e ON e.id = s.event_id
    WHERE s.user_id = $1
    ORDER BY s.created_at DESC
  `, [req.user.id]);
  res.json({
    ids: rows.map((r) => r.id),
    events: rows.map((r) => ({ id: r.id, match: r.match, venue: r.venue, borough: r.borough }))
  });
});
router3.post("/:eventId", async (req, res) => {
  const event = await get("SELECT id FROM events WHERE id = $1", [req.params.eventId]);
  if (!event) return res.status(404).json({ error: "Event not found" });
  await run(
    "INSERT INTO saved_events (user_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [req.user.id, req.params.eventId]
  );
  res.json({ saved: true });
});
router3.delete("/:eventId", async (req, res) => {
  await run("DELETE FROM saved_events WHERE user_id = $1 AND event_id = $2", [req.user.id, req.params.eventId]);
  res.json({ saved: false });
});
var saved_default = router3;

// src/routes/polls.js
import { Router as Router4 } from "express";
var router4 = Router4();
async function serializePoll(poll, userId) {
  const options = await all("SELECT * FROM poll_options WHERE poll_id = $1 ORDER BY id ASC", [poll.id]);
  const liveRows = await all(
    "SELECT option_id, COUNT(*)::int AS n FROM poll_votes WHERE poll_id = $1 GROUP BY option_id",
    [poll.id]
  );
  const liveCounts = liveRows.reduce((acc, r) => (acc[r.option_id] = r.n, acc), {});
  const opts = options.map((o) => ({
    id: o.id,
    name: o.name,
    votes: o.seed_votes + (liveCounts[o.id] || 0)
  }));
  const totalVotes = opts.reduce((s, o) => s + o.votes, 0);
  const userVote = userId ? await get("SELECT option_id FROM poll_votes WHERE user_id = $1 AND poll_id = $2", [userId, poll.id]) : null;
  return {
    id: poll.id,
    country: poll.country,
    borough: poll.borough,
    question: poll.question,
    sub: poll.sub,
    closes: poll.closes,
    options: opts,
    totalVotes,
    votedOptionId: userVote?.option_id ?? null,
    locked: !await hasBorough(userId, poll.borough)
  };
}
router4.get("/", async (req, res) => {
  const { borough, country } = req.query;
  const where = [];
  const params = [];
  if (borough) {
    params.push(borough);
    where.push("borough = $" + params.length);
  }
  if (country) {
    params.push(country);
    where.push("country = $" + params.length);
  }
  const sql = `SELECT * FROM polls ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id ASC`;
  const rows = await all(sql, params);
  const polls = await Promise.all(rows.map((p) => serializePoll(p, req.user?.id)));
  res.json({ polls });
});
router4.post("/:id/vote", requireAuth, async (req, res) => {
  const poll = await get("SELECT * FROM polls WHERE id = $1", [req.params.id]);
  if (!poll) return res.status(404).json({ error: "Poll not found" });
  if (!await hasBorough(req.user.id, poll.borough)) {
    return res.status(403).json({ error: "Borough locked", locked: true });
  }
  const option = await get("SELECT id FROM poll_options WHERE id = $1 AND poll_id = $2", [req.body.optionId, poll.id]);
  if (!option) return res.status(400).json({ error: "Invalid optionId for this poll" });
  const already = await get("SELECT 1 FROM poll_votes WHERE user_id = $1 AND poll_id = $2", [req.user.id, poll.id]);
  if (already) return res.status(409).json({ error: "Already voted", poll: await serializePoll(poll, req.user.id) });
  await run(
    "INSERT INTO poll_votes (user_id, poll_id, option_id) VALUES ($1, $2, $3)",
    [req.user.id, poll.id, option.id]
  );
  res.json({ poll: await serializePoll(poll, req.user.id) });
});
var polls_default = router4;

// src/routes/content.js
import { Router as Router5 } from "express";
var router5 = Router5();
router5.get("/countries", (_req, res) => {
  res.json({ countries });
});
router5.get("/schedule", async (req, res) => {
  const { country, sport } = req.query;
  const where = [];
  const params = [];
  if (country) {
    params.push(country);
    where.push("country = $" + params.length);
  }
  if (sport) {
    params.push(sport);
    where.push("sport = $" + params.length);
  }
  const sql = `SELECT * FROM schedule ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id ASC`;
  const rows = (await all(sql, params)).map((r) => ({
    country: r.country,
    sport: r.sport,
    home: { name: r.home_name, flag: r.home_flag },
    away: { name: r.away_name, flag: r.away_flag },
    tournament: r.tournament,
    date: r.date,
    venue: r.venue
  }));
  res.json({ schedule: rows });
});
router5.get("/lineups/:country?", async (req, res) => {
  const rows = req.params.country ? await all("SELECT * FROM lineups WHERE country = $1", [req.params.country]) : await all("SELECT * FROM lineups", []);
  const map = {};
  for (const r of rows) {
    map[r.country] = {
      team: r.team,
      formation: r.formation,
      color: JSON.parse(r.color || "[]"),
      rows: JSON.parse(r.rows || "[]")
    };
  }
  if (req.params.country) {
    const one = map[req.params.country];
    if (!one) return res.status(404).json({ error: "No lineup for that country" });
    return res.json({ lineup: one });
  }
  res.json({ lineups: map });
});
var content_default = router5;

// src/routes/chat.js
import { Router as Router6 } from "express";

// src/realtime.js
import jwt2 from "jsonwebtoken";
var rooms = /* @__PURE__ */ new Map();
function roomFor(country) {
  if (!rooms.has(country)) rooms.set(country, /* @__PURE__ */ new Set());
  return rooms.get(country);
}
function toWire(row) {
  return {
    type: "message",
    id: row.id,
    country: row.country,
    user: row.username,
    msg: row.msg,
    createdAt: row.created_at
  };
}
function broadcast(row) {
  const payload = JSON.stringify(toWire(row));
  for (const ws of roomFor(row.country)) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

// src/routes/chat.js
var router6 = Router6();
function wire(r) {
  return { id: r.id, country: r.country, user: r.username, msg: r.msg, createdAt: r.created_at };
}
router6.get("/:country", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const after = Number(req.query.after) || 0;
  let rows;
  if (after) {
    rows = await all(
      "SELECT * FROM chat_messages WHERE country = $1 AND id > $2 ORDER BY id ASC LIMIT $3",
      [req.params.country, after, limit]
    );
  } else {
    rows = await all(
      `SELECT * FROM (
         SELECT * FROM chat_messages WHERE country = $1 ORDER BY id DESC LIMIT $2
       ) sub ORDER BY id ASC`,
      [req.params.country, limit]
    );
  }
  res.json({ messages: rows.map(wire) });
});
router6.post("/:country", requireAuth, async (req, res) => {
  const text = String(req.body.msg || "").trim().slice(0, 500);
  if (!text) return res.status(400).json({ error: "Message required" });
  const { row } = await run(
    "INSERT INTO chat_messages (country, user_id, username, msg) VALUES ($1, $2, $3, $4) RETURNING *",
    [req.params.country, req.user.id, req.user.display_name, text]
  );
  broadcast(row);
  res.status(201).json({ message: wire(row) });
});
var chat_default = router6;

// src/routes/scores.js
import { Router as Router7 } from "express";

// src/sports.js
var ESPN = "https://site.api.espn.com/apis/site/v2/sports";
var SOURCES = {
  Soccer: [
    { league: "fifa.world", label: "World Cup" },
    { league: "fifa.friendly", label: "Intl Friendly" },
    { league: "usa.1", label: "MLS" },
    { league: "eng.1", label: "Premier League" },
    { league: "esp.1", label: "La Liga" },
    { league: "uefa.champions", label: "Champions League" },
    { path: "soccer" }
  ],
  NBA: [{ path: "basketball", league: "nba", label: "NBA" }],
  NFL: [{ path: "football", league: "nfl", label: "NFL" }],
  MLB: [{ path: "baseball", league: "mlb", label: "MLB" }],
  NHL: [{ path: "hockey", league: "nhl", label: "NHL" }]
};
var PATHS = { Soccer: "soccer", NBA: "basketball", NFL: "football", MLB: "baseball", NHL: "hockey" };
var cache = /* @__PURE__ */ new Map();
var TTL_MS = 6e4;
async function fetchJson(url) {
  const hit = cache.get(url);
  if (hit && nowMs() - hit.at < TTL_MS) return hit.data;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9e3);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("ESPN " + res.status);
    const data = await res.json();
    cache.set(url, { at: nowMs(), data });
    return data;
  } finally {
    clearTimeout(timer);
  }
}
function nowMs() {
  return Date.now();
}
function normalizeEvent(ev, sport, leagueLabel) {
  const comp = ev.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  if (!home || !away) return null;
  const status = ev.status?.type || {};
  const side = (c) => ({
    name: c.team?.displayName || c.team?.name || c.team?.shortDisplayName || "",
    short: c.team?.abbreviation || "",
    logo: c.team?.logo || c.team?.logos?.[0]?.href || "",
    score: c.score ?? null,
    winner: Boolean(c.winner)
  });
  return {
    id: ev.id,
    sport,
    league: leagueLabel || ev.season?.slug || "",
    name: ev.name || `${away?.team?.displayName} at ${home?.team?.displayName}`,
    date: ev.date,
    venue: comp.venue?.fullName || "",
    state: status.state || "pre",
    // pre | in | post
    live: status.state === "in",
    completed: Boolean(status.completed),
    statusDetail: status.shortDetail || status.detail || "",
    home: side(home),
    away: side(away)
  };
}
async function getScores(sport) {
  const sources = SOURCES[sport];
  if (!sources) return [];
  const out = [];
  await Promise.all(sources.map(async (s) => {
    const path2 = s.path || PATHS[sport];
    const url = s.league ? `${ESPN}/${path2}/${s.league}/scoreboard` : `${ESPN}/${path2}/scoreboard`;
    try {
      const data = await fetchJson(url);
      for (const ev of data.events || []) {
        const n = normalizeEvent(ev, sport, s.label || data.leagues?.[0]?.name);
        if (n) out.push(n);
      }
    } catch {
    }
  }));
  const seen = /* @__PURE__ */ new Set();
  return out.filter((e) => seen.has(e.id) ? false : seen.add(e.id)).sort((a, b) => {
    if (a.live !== b.live) return a.live ? -1 : 1;
    return new Date(a.date) - new Date(b.date);
  });
}
var SUPPORTED_SPORTS = Object.keys(SOURCES);

// src/routes/scores.js
var router7 = Router7();
router7.get("/", async (req, res) => {
  try {
    if (req.query.sport) {
      const sport = String(req.query.sport);
      if (!SUPPORTED_SPORTS.includes(sport)) return res.status(400).json({ error: "Unsupported sport" });
      return res.json({ sport, fixtures: await getScores(sport) });
    }
    const all2 = {};
    await Promise.all(SUPPORTED_SPORTS.map(async (s) => {
      all2[s] = await getScores(s);
    }));
    res.json({ sports: all2 });
  } catch (e) {
    res.status(502).json({ error: "Sports feed unavailable" });
  }
});
var scores_default = router7;

// src/routes/billing.js
import { Router as Router8 } from "express";
import Stripe from "stripe";
var router8 = Router8();
var stripe = stripeEnabled ? new Stripe(config.stripeSecretKey) : null;
router8.get("/config", (_req, res) => {
  res.json({ stripeEnabled, priceCents: config.unlockPriceCents });
});
router8.post("/checkout", requireAuth, async (req, res) => {
  if (!stripeEnabled) return res.json({ devMode: true });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: String(req.user.id),
      customer_email: req.user.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: config.unlockPriceCents,
          product_data: { name: "FanHub \u2014 unlock all boroughs" }
        }
      }],
      success_url: `${config.clientUrl}/?unlocked=1`,
      cancel_url: `${config.clientUrl}/?canceled=1`
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    res.status(502).json({ error: "Could not start checkout" });
  }
});
router8.post("/dev-unlock", requireAuth, async (req, res) => {
  if (stripeEnabled) return res.status(403).json({ error: "Use the real checkout flow" });
  await activateSubscription(req.user.id, { source: "dev" });
  res.json({ entitlements: await getEntitlements(req.user.id) });
});
async function webhookHandler(req, res) {
  if (!stripeEnabled) return res.status(404).end();
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], config.stripeWebhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = Number(session.client_reference_id);
    const user = userId && await get("SELECT id FROM users WHERE id = $1", [userId]);
    if (user) {
      await activateSubscription(userId, {
        source: "purchase",
        stripeCustomerId: session.customer,
        stripeSessionId: session.id
      });
    }
  }
  res.json({ received: true });
}
var billing_default = router8;

// src/app.js
var app = express();
app.use(cors({ origin: true, credentials: true }));
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), webhookHandler);
app.use(express.json());
app.use(attachUser);
app.get("/api/health", (_req, res) => res.json({ ok: true, stripeEnabled }));
app.use("/api/auth", auth_default);
app.use("/api/events", events_default);
app.use("/api/saved", saved_default);
app.use("/api/polls", polls_default);
app.use("/api", content_default);
app.use("/api/chat", chat_default);
app.use("/api/scores", scores_default);
app.use("/api/billing", billing_default);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
var app_default = app;
export {
  app,
  app_default as default
};
