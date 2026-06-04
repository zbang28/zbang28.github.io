import { Router } from 'express';
import { get, all, run } from '../db.js';
import { requireAuth } from '../auth.js';
import { isWorldCupMatch } from '../reference.js';
import { hasBorough } from '../entitlements.js';

export const router = Router();

// Convert a DB row into the shape the frontend expects, decorated with
// per-user context (saved / locked / reaction counts).
async function serialize(row, userId) {
  const reactionRows = await all(
    'SELECT emoji, COUNT(*)::int AS n FROM event_reactions WHERE event_id = $1 GROUP BY emoji',
    [row.id]
  );
  const reactions = reactionRows.reduce((acc, r) => ((acc[r.emoji] = r.n), acc), {});

  const isSaved = userId
    ? Boolean(await get('SELECT 1 FROM saved_events WHERE user_id = $1 AND event_id = $2', [userId, row.id]))
    : false;

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
    perks: JSON.parse(row.perks || '[]'),
    live: Boolean(row.live),
    when: row.when_label,
    lat: row.lat,
    lng: row.lng,
    eventType: row.event_type,
    price: row.price,
    hostId: row.host_id,
    isWorldCup: isWorldCupMatch(row.match),
    locked: !(await hasBorough(userId, row.borough)),
    saved: isSaved,
    reactions,
  };
}

// GET /api/events?eventType=&country=&sport=&borough=&worldcup=true|false&q=
router.get('/', async (req, res) => {
  const { eventType, country, sport, borough, worldcup, q } = req.query;
  const where = [];
  const params = [];
  const add = (clause, val) => { params.push(val); where.push(clause.replace('?', '$' + params.length)); };

  if (eventType) add('event_type = ?', eventType);
  if (country) add('country = ?', country);
  if (sport) add('sport = ?', sport);
  if (borough) add('borough = ?', borough);
  if (q) {
    const like = `%${q}%`;
    params.push(like);
    const p = '$' + params.length;
    where.push(`(match ILIKE ${p} OR venue ILIKE ${p} OR neighborhood ILIKE ${p})`);
  }

  const sql = `SELECT * FROM events ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY distance ASC`;
  let rows = await all(sql, params);

  if (worldcup === 'true') rows = rows.filter((r) => isWorldCupMatch(r.match));
  else if (worldcup === 'false') rows = rows.filter((r) => !isWorldCupMatch(r.match));

  res.json({ events: await Promise.all(rows.map((r) => serialize(r, req.user?.id))) });
});

router.get('/:id', async (req, res) => {
  const row = await get('SELECT * FROM events WHERE id = $1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Event not found' });
  res.json({ event: await serialize(row, req.user?.id) });
});

const EVENT_TYPES = new Set(['watch-party', 'parade', 'pickup']);

// Host a new event (auth required).
router.post('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  const required = ['sport', 'match', 'venue', 'borough', 'eventType'];
  for (const f of required) {
    if (!String(b[f] || '').trim()) return res.status(400).json({ error: `Missing field: ${f}` });
  }
  if (!EVENT_TYPES.has(b.eventType)) return res.status(400).json({ error: 'Invalid eventType' });

  const { row } = await run(`
    INSERT INTO events (sport, country, match, venue, vtype, neighborhood, borough,
      distance, time, perks, live, when_label, lat, lng, event_type, price, host_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *
  `, [
    b.sport, b.country || null, b.match, b.venue, b.vtype || null, b.neighborhood || null, b.borough,
    Number(b.distance) || 0, b.time || null, JSON.stringify(Array.isArray(b.perks) ? b.perks : []),
    b.live ? 1 : 0, b.when || null, b.lat ?? null, b.lng ?? null, b.eventType, b.price || 'Free', req.user.id,
  ]);

  res.status(201).json({ event: await serialize(row, req.user.id) });
});

// Toggle a reaction emoji on an event (auth required).
router.post('/:id/react', requireAuth, async (req, res) => {
  const emoji = String(req.body.emoji || '').trim();
  if (!emoji) return res.status(400).json({ error: 'emoji required' });
  const event = await get('SELECT id FROM events WHERE id = $1', [req.params.id]);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const existing = await get(
    'SELECT 1 FROM event_reactions WHERE user_id = $1 AND event_id = $2 AND emoji = $3',
    [req.user.id, req.params.id, emoji]
  );
  if (existing) {
    await run('DELETE FROM event_reactions WHERE user_id = $1 AND event_id = $2 AND emoji = $3',
      [req.user.id, req.params.id, emoji]);
  } else {
    await run('INSERT INTO event_reactions (user_id, event_id, emoji) VALUES ($1, $2, $3)',
      [req.user.id, req.params.id, emoji]);
  }
  const row = await get('SELECT * FROM events WHERE id = $1', [req.params.id]);
  res.json({ event: await serialize(row, req.user.id) });
});

export default router;
