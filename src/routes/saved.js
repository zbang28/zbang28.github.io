import { Router } from 'express';
import { get, all, run } from '../db.js';
import { requireAuth } from '../auth.js';

export const router = Router();
router.use(requireAuth);

// GET /api/saved -> list of saved event IDs (+ the events themselves)
router.get('/', async (req, res) => {
  const rows = await all(`
    SELECT e.* FROM saved_events s
    JOIN events e ON e.id = s.event_id
    WHERE s.user_id = $1
    ORDER BY s.created_at DESC
  `, [req.user.id]);
  res.json({
    ids: rows.map((r) => r.id),
    events: rows.map((r) => ({ id: r.id, match: r.match, venue: r.venue, borough: r.borough })),
  });
});

// POST /api/saved/:eventId  (idempotent add)
router.post('/:eventId', async (req, res) => {
  const event = await get('SELECT id FROM events WHERE id = $1', [req.params.eventId]);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  await run(
    'INSERT INTO saved_events (user_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.user.id, req.params.eventId]
  );
  res.json({ saved: true });
});

// DELETE /api/saved/:eventId
router.delete('/:eventId', async (req, res) => {
  await run('DELETE FROM saved_events WHERE user_id = $1 AND event_id = $2', [req.user.id, req.params.eventId]);
  res.json({ saved: false });
});

export default router;
