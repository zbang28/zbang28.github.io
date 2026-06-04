import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { config, stripeEnabled } from './config.js';
import './db.js'; // runs migrations on import
import { attachUser } from './auth.js';
import { createChatServer } from './realtime.js';

import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import savedRoutes from './routes/saved.js';
import pollRoutes from './routes/polls.js';
import contentRoutes from './routes/content.js';
import chatRoutes from './routes/chat.js';
import scoresRoutes from './routes/scores.js';
import billingRoutes, { webhookHandler } from './routes/billing.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));

// Stripe webhook needs the raw body — must be registered BEFORE express.json().
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), webhookHandler);

app.use(express.json());
app.use(attachUser); // populates req.user when a valid token is present

app.get('/api/health', (_req, res) => res.json({ ok: true, stripeEnabled }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api', contentRoutes); // /api/countries, /api/schedule, /api/lineups
app.use('/api/chat', chatRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/billing', billingRoutes);

// Serve the static frontend (index.html + assets) from the repo root.
app.use(express.static(config.repoRoot));

// 404 for unmatched API routes (after static so the frontend still loads).
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

const server = http.createServer(app);
createChatServer(server); // attaches WebSocket chat at /ws

server.listen(config.port, () => {
  console.log(`FanHub server on http://localhost:${config.port}`);
  console.log(`  WebSocket chat:  ws://localhost:${config.port}/ws`);
  console.log(`  Stripe payments: ${stripeEnabled ? 'enabled' : 'dev-unlock fallback'}`);
});
