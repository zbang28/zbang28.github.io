import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { get, run } from './db.js';

// country code -> Set<WebSocket>
const rooms = new Map();

function roomFor(country) {
  if (!rooms.has(country)) rooms.set(country, new Set());
  return rooms.get(country);
}

async function userFromToken(token) {
  if (!token) return null;
  try {
    const { uid } = jwt.verify(token, config.jwtSecret);
    return await get('SELECT id, display_name FROM users WHERE id = $1', [uid]);
  } catch {
    return null;
  }
}

async function persist(country, user, username, msg) {
  const { row } = await run(
    'INSERT INTO chat_messages (country, user_id, username, msg) VALUES ($1, $2, $3, $4) RETURNING *',
    [country, user?.id ?? null, username, msg]
  );
  return row;
}

function toWire(row) {
  return {
    type: 'message',
    id: row.id,
    country: row.country,
    user: row.username,
    msg: row.msg,
    createdAt: row.created_at,
  };
}

// Broadcast an already-persisted DB row to everyone in its country room.
// On serverless (no live sockets) this is a no-op — clients poll instead.
export function broadcast(row) {
  const payload = JSON.stringify(toWire(row));
  for (const ws of roomFor(row.country)) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

const RATE_WINDOW_MS = 4000;
const RATE_MAX = 5;
const MAX_LEN = 500;

// Local-dev realtime. Imported lazily so the serverless bundle never loads `ws`.
export async function createChatServer(httpServer) {
  const { WebSocketServer } = await import('ws');
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    ws.user = await userFromToken(url.searchParams.get('token'));
    ws.country = null;
    ws.stamps = [];

    ws.send(JSON.stringify({ type: 'hello', authed: Boolean(ws.user) }));

    ws.on('message', async (raw) => {
      let data;
      try { data = JSON.parse(raw.toString()); } catch { return; }

      if (data.type === 'join' && data.country) {
        if (ws.country) roomFor(ws.country).delete(ws);
        ws.country = String(data.country);
        roomFor(ws.country).add(ws);
        return;
      }

      if (data.type === 'message') {
        const country = String(data.country || ws.country || '');
        const text = String(data.msg || '').trim().slice(0, MAX_LEN);
        if (!country || !text) return;
        if (!ws.user) { ws.send(JSON.stringify({ type: 'error', error: 'Sign in to chat' })); return; }
        const now = Date.now();
        ws.stamps = ws.stamps.filter((t) => now - t < RATE_WINDOW_MS);
        if (ws.stamps.length >= RATE_MAX) { ws.send(JSON.stringify({ type: 'error', error: 'Slow down' })); return; }
        ws.stamps.push(now);

        const row = await persist(country, ws.user, ws.user.display_name, text);
        broadcast(row);
      }
    });

    ws.on('close', () => { if (ws.country) roomFor(ws.country).delete(ws); });
  });

  return wss;
}
