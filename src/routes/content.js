import { Router } from 'express';
import { all } from '../db.js';
import { countries } from '../reference.js';

export const router = Router();

// GET /api/countries — for the country filter bar
router.get('/countries', (_req, res) => {
  res.json({ countries });
});

// GET /api/schedule?country=&sport=
router.get('/schedule', async (req, res) => {
  const { country, sport } = req.query;
  const where = [];
  const params = [];
  if (country) { params.push(country); where.push('country = $' + params.length); }
  if (sport) { params.push(sport); where.push('sport = $' + params.length); }
  const sql = `SELECT * FROM schedule ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id ASC`;
  const rows = (await all(sql, params)).map((r) => ({
    country: r.country,
    sport: r.sport,
    home: { name: r.home_name, flag: r.home_flag },
    away: { name: r.away_name, flag: r.away_flag },
    tournament: r.tournament,
    date: r.date,
    venue: r.venue,
  }));
  res.json({ schedule: rows });
});

// GET /api/lineups          — all lineups keyed by country code
// GET /api/lineups/:country — a single lineup
router.get('/lineups/:country?', async (req, res) => {
  const rows = req.params.country
    ? await all('SELECT * FROM lineups WHERE country = $1', [req.params.country])
    : await all('SELECT * FROM lineups', []);

  const map = {};
  for (const r of rows) {
    map[r.country] = {
      team: r.team,
      formation: r.formation,
      color: JSON.parse(r.color || '[]'),
      rows: JSON.parse(r.rows || '[]'),
    };
  }

  if (req.params.country) {
    const one = map[req.params.country];
    if (!one) return res.status(404).json({ error: 'No lineup for that country' });
    return res.json({ lineup: one });
  }
  res.json({ lineups: map });
});

export default router;
