import { Router } from 'express';
import { get, all } from '../db.js';

export const router = Router();

// Convert a DB row into the shape the frontend expects (tags back to an array).
function serialize(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    neighborhood: row.neighborhood,
    borough: row.borough,
    address: row.address,
    website: row.website,
    instagram: row.instagram,
    phone: row.phone,
    vtype: row.vtype,
    tags: JSON.parse(row.tags || '[]'),
    sourceUrl: row.source_url,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
  };
}

// GET /api/venues?neighborhood=&borough=&q=&limit= — public directory listing.
router.get('/', async (req, res) => {
  const { neighborhood, borough, q } = req.query;
  const where = [];
  const params = [];
  const add = (clause, val) => { params.push(val); where.push(clause.replace('?', '$' + params.length)); };

  if (neighborhood) add('neighborhood = ?', neighborhood);
  if (borough) add('borough = ?', borough);
  if (q) {
    const like = `%${q}%`;
    params.push(like);
    const p = '$' + params.length;
    where.push(`(name ILIKE ${p} OR neighborhood ILIKE ${p} OR address ILIKE ${p})`);
  }

  let sql = `SELECT * FROM venues ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY neighborhood ASC, name ASC`;
  const limit = Number(req.query.limit);
  if (Number.isFinite(limit) && limit > 0) {
    params.push(Math.floor(limit));
    sql += ' LIMIT $' + params.length;
  }

  const rows = await all(sql, params);
  res.json({ venues: rows.map(serialize) });
});

// GET /api/venues/:slug — a single venue.
router.get('/:slug', async (req, res) => {
  const row = await get('SELECT * FROM venues WHERE slug = $1', [req.params.slug]);
  if (!row) return res.status(404).json({ error: 'Venue not found' });
  res.json({ venue: serialize(row) });
});

export default router;
