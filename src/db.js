import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

// Neon (and most hosted PG) require TLS; local Docker does not.
const isLocal = /localhost|127\.0\.0\.1/.test(config.databaseUrl);

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 5,
});

// --- Query helpers (async). Use $1, $2 … placeholders. ---
export async function query(text, params = []) {
  return pool.query(text, params);
}
export async function get(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}
export async function all(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows;
}
// run() returns the first row (use RETURNING for inserts) plus rowCount.
export async function run(text, params = []) {
  const res = await pool.query(text, params);
  return { row: res.rows[0] || null, rowCount: res.rowCount };
}

// ---------------------------------------------------------------------------
// Schema. Idempotent. Run via `npm run migrate` (not on every import).
// ---------------------------------------------------------------------------
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name  TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS entitlements (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      borough    TEXT NOT NULL,
      source     TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, borough)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id            INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      status             TEXT NOT NULL DEFAULT 'inactive',
      stripe_customer_id TEXT,
      stripe_session_id  TEXT,
      activated_at       TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS events (
      id           SERIAL PRIMARY KEY,
      sport        TEXT NOT NULL,
      country      TEXT,
      match        TEXT NOT NULL,
      venue        TEXT NOT NULL,
      vtype        TEXT,
      neighborhood TEXT,
      borough      TEXT NOT NULL,
      distance     REAL DEFAULT 0,
      time         TEXT,
      perks        TEXT NOT NULL DEFAULT '[]',
      live         INTEGER NOT NULL DEFAULT 0,
      when_label   TEXT,
      lat          REAL,
      lng          REAL,
      event_type   TEXT NOT NULL,
      price        TEXT,
      host_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS saved_events (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS event_reactions (
      user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      emoji    TEXT NOT NULL,
      PRIMARY KEY (user_id, event_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS polls (
      id         SERIAL PRIMARY KEY,
      country    TEXT,
      borough    TEXT,
      question   TEXT NOT NULL,
      sub        TEXT,
      closes     TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id         SERIAL PRIMARY KEY,
      poll_id    INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      seed_votes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      poll_id    INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      option_id  INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, poll_id)
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id         SERIAL PRIMARY KEY,
      country    TEXT,
      sport      TEXT,
      home_name  TEXT,
      home_flag  TEXT,
      away_name  TEXT,
      away_flag  TEXT,
      tournament TEXT,
      date       TEXT,
      venue      TEXT
    );

    CREATE TABLE IF NOT EXISTS lineups (
      country   TEXT PRIMARY KEY,
      team      TEXT,
      formation TEXT,
      color     TEXT,
      rows      TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id         SERIAL PRIMARY KEY,
      country    TEXT NOT NULL,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      username   TEXT NOT NULL,
      msg        TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS venues (
      id           SERIAL PRIMARY KEY,
      slug         TEXT UNIQUE NOT NULL,
      name         TEXT NOT NULL,
      neighborhood TEXT,
      borough      TEXT,
      address      TEXT,
      website      TEXT,
      instagram    TEXT,
      phone        TEXT,
      vtype        TEXT,
      tags         TEXT NOT NULL DEFAULT '[]',  -- JSON array string, like events.perks
      source_url   TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_borough ON events(borough);
    CREATE INDEX IF NOT EXISTS idx_chat_country ON chat_messages(country, created_at);
    CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);
    CREATE INDEX IF NOT EXISTS idx_venues_neighborhood ON venues(neighborhood);
    CREATE INDEX IF NOT EXISTS idx_venues_borough ON venues(borough);
  `);
}
