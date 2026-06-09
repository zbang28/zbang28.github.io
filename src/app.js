import express from 'express';
import cors from 'cors';
import { stripeEnabled } from './config.js';
import { attachUser } from './auth.js';

import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import savedRoutes from './routes/saved.js';
import pollRoutes from './routes/polls.js';
import contentRoutes from './routes/content.js';
import chatRoutes from './routes/chat.js';
import scoresRoutes from './routes/scores.js';
import venuesRoutes from './routes/venues.js';
import billingRoutes, { webhookHandler } from './routes/billing.js';

// The API as an Express app. No app.listen / static / WebSocket here so it can
// run both as a long-lived server (local) and as a Vercel serverless function.
export const app = express();

app.use(cors({ origin: true, credentials: true }));

// Stripe webhook needs the raw body — register BEFORE express.json().
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
app.use('/api/venues', venuesRoutes);
app.use('/api/billing', billingRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

export default app;
