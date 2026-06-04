import { Router } from 'express';
import { get, all, run } from '../db.js';
import { requireAuth } from '../auth.js';
import { broadcast } from '../realtime.js';

export const router = Router();

function wire(r) {
  return { id: r.id, country: r.country, user: r.username, msg: r.msg, createdAt: r.created_at };
}

// GET /api/chat/:country?limit=50&after=<id> — history (oldest -> newest).
// `after` lets the polling client fetch only new messages.
router.get('/:country', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const after = Number(req.query.after) || 0;
  let rows;
  if (after) {
    rows = await all(
      'SELECT * FROM chat_messages WHERE country = $1 AND id > $2 ORDER BY id ASC LIMIT $3',
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

// POST /api/chat/:country { msg } — post (also broadcasts to any WS clients)
router.post('/:country', requireAuth, async (req, res) => {
  const text = String(req.body.msg || '').trim().slice(0, 500);
  if (!text) return res.status(400).json({ error: 'Message required' });

  const { row } = await run(
    'INSERT INTO chat_messages (country, user_id, username, msg) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.params.country, req.user.id, req.user.display_name, text]
  );

  broadcast(row);
  res.status(201).json({ message: wire(row) });
});

export default router;
