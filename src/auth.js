import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { get } from './db.js';

export function signToken(user) {
  return jwt.sign({ uid: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

async function userFromToken(token) {
  try {
    const { uid } = jwt.verify(token, config.jwtSecret);
    return await get('SELECT id, email, display_name, created_at FROM users WHERE id = $1', [uid]);
  } catch {
    return null;
  }
}

function tokenFromReq(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

// Attaches req.user if a valid token is present; never blocks.
export async function attachUser(req, _res, next) {
  const token = tokenFromReq(req);
  req.user = token ? await userFromToken(token) : null;
  next();
}

// Blocks the request unless authenticated.
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}
