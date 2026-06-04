import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, run } from '../db.js';
import { signToken, requireAuth } from '../auth.js';
import { grantBorough, getEntitlements, FREE_BOROUGH } from '../entitlements.js';

export const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(u) {
  return { id: u.id, email: u.email, displayName: u.display_name, createdAt: u.created_at };
}

router.post('/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const displayName = String(req.body.displayName || '').trim() || email.split('@')[0];

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const exists = await get('SELECT 1 FROM users WHERE email = $1', [email]);
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const { row } = await run(
    'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING *',
    [email, hash, displayName]
  );

  // Everyone gets the free borough on signup.
  await grantBorough(row.id, FREE_BOROUGH, 'free');

  const token = signToken(row);
  res.status(201).json({ token, user: publicUser(row), entitlements: await getEntitlements(row.id) });
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const user = await get('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user), entitlements: await getEntitlements(user.id) });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user), entitlements: await getEntitlements(req.user.id) });
});

export default router;
