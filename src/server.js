// Local development server: the API app + static frontend + WebSocket chat.
// On Vercel, api/index.js uses app.js directly and Vercel serves the static files.
import http from 'node:http';
import express from 'express';
import { config, stripeEnabled } from './config.js';
import { app } from './app.js';
import { createChatServer } from './realtime.js';

// Serve the static frontend (index.html) from the project root.
app.use(express.static(config.repoRoot));

const server = http.createServer(app);
createChatServer(server); // attaches WebSocket chat at /ws (local only)

server.listen(config.port, () => {
  console.log(`FanHub server on http://localhost:${config.port}`);
  console.log(`  WebSocket chat:  ws://localhost:${config.port}/ws`);
  console.log(`  Stripe payments: ${stripeEnabled ? 'enabled' : 'dev-unlock fallback'}`);
});
