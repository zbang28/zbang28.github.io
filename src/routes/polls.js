import { Router } from 'express';
import { get, all, run } from '../db.js';
import { requireAuth } from '../auth.js';
import { hasBorough } from '../entitlements.js';

export const router = Router();

async function serializePoll(poll, userId) {
  const options = await all('SELECT * FROM poll_options WHERE poll_id = $1 ORDER BY id ASC', [poll.id]);
  const liveRows = await all(
    'SELECT option_id, COUNT(*)::int AS n FROM poll_votes WHERE poll_id = $1 GROUP BY option_id',
    [poll.id]
  );
  const liveCounts = liveRows.reduce((acc, r) => ((acc[r.option_id] = r.n), acc), {});

  const opts = options.map((o) => ({
    id: o.id,
    name: o.name,
    votes: o.seed_votes + (liveCounts[o.id] || 0),
  }));
  const totalVotes = opts.reduce((s, o) => s + o.votes, 0);

  const userVote = userId
    ? await get('SELECT option_id FROM poll_votes WHERE user_id = $1 AND poll_id = $2', [userId, poll.id])
    : null;

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
    locked: !(await hasBorough(userId, poll.borough)),
  };
}

// GET /api/polls?borough=&country=
router.get('/', async (req, res) => {
  const { borough, country } = req.query;
  const where = [];
  const params = [];
  if (borough) { params.push(borough); where.push('borough = $' + params.length); }
  if (country) { params.push(country); where.push('country = $' + params.length); }
  const sql = `SELECT * FROM polls ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id ASC`;
  const rows = await all(sql, params);
  const polls = await Promise.all(rows.map((p) => serializePoll(p, req.user?.id)));
  res.json({ polls });
});

// POST /api/polls/:id/vote { optionId }
router.post('/:id/vote', requireAuth, async (req, res) => {
  const poll = await get('SELECT * FROM polls WHERE id = $1', [req.params.id]);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  if (!(await hasBorough(req.user.id, poll.borough))) {
    return res.status(403).json({ error: 'Borough locked', locked: true });
  }

  const option = await get('SELECT id FROM poll_options WHERE id = $1 AND poll_id = $2', [req.body.optionId, poll.id]);
  if (!option) return res.status(400).json({ error: 'Invalid optionId for this poll' });

  const already = await get('SELECT 1 FROM poll_votes WHERE user_id = $1 AND poll_id = $2', [req.user.id, poll.id]);
  if (already) return res.status(409).json({ error: 'Already voted', poll: await serializePoll(poll, req.user.id) });

  await run('INSERT INTO poll_votes (user_id, poll_id, option_id) VALUES ($1, $2, $3)',
    [req.user.id, poll.id, option.id]);

  res.json({ poll: await serializePoll(poll, req.user.id) });
});

export default router;
