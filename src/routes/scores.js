import { Router } from 'express';
import { getScores, SUPPORTED_SPORTS } from '../sports.js';

export const router = Router();

// GET /api/scores?sport=Soccer  -> live + upcoming real fixtures (ESPN)
// GET /api/scores               -> all supported sports, keyed by sport
router.get('/', async (req, res) => {
  try {
    if (req.query.sport) {
      const sport = String(req.query.sport);
      if (!SUPPORTED_SPORTS.includes(sport)) return res.status(400).json({ error: 'Unsupported sport' });
      return res.json({ sport, fixtures: await getScores(sport) });
    }
    const all = {};
    await Promise.all(SUPPORTED_SPORTS.map(async (s) => { all[s] = await getScores(s); }));
    res.json({ sports: all });
  } catch (e) {
    res.status(502).json({ error: 'Sports feed unavailable' });
  }
});

export default router;
