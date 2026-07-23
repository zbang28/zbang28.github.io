# Lineup / FanHub

World Cup Watch Party Platform for NYC & SF
- 300~400+ people signed up on waitlist pre-launch

**Live:** https://findhomecrowd.com

## Stack

- **Frontend** — single static `index.html` (no build step)
- **API** — Express, deployed as a Vercel serverless function (`api/index.js`)
- **Database** — Postgres (Neon on Vercel; local dev uses Docker Postgres)
- **Auth** — JWT + bcrypt (email / password)
- **Sports data** — live fixtures & scores from ESPN's public API (no key)
- **Chat** — WebSocket locally; HTTP polling on Vercel (serverless-safe)
- **Payments** — Stripe borough unlock, with a dev-unlock fallback when no keys

## Local development

```bash
# 1. Start a local Postgres (Docker)
docker run -d --name fanhub-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=fanhub -p 5433:5432 postgres:16-alpine

# 2. Install + set up the DB
npm install
npm run migrate
npm run seed

# 3. Run (serves the frontend + API on one origin)
npm start          # http://localhost:4000
```

`npm run dev` runs with `--watch`. `npm run reset` wipes content tables and re-seeds
(users/billing are preserved). The local server connects to the Docker DB by default
(see `src/config.js`); override with `DATABASE_URL` in a `.env` file.

## Deploying to Vercel

The project is already linked and deployed. To redeploy:

```bash
vercel deploy --prod
```

Database (Neon) was provisioned with `vercel integration add neon`, which connects it
and injects `DATABASE_URL` into all environments. After provisioning, the schema was
applied with `npm run migrate` and `npm run seed` against the Neon connection string.

Env vars on the project: `DATABASE_URL` (Neon), `JWT_SECRET`, `CLIENT_URL`, and
optional `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`.

## Project layout

```
index.html          frontend (static)
api/index.js        Vercel serverless entry → src/app.js
vercel.json         routing (/api/* → function) + framework:null
src/
  app.js            Express app (routes only, no listen/static/WS)
  server.js         local dev entry (app + static + WebSocket + listen)
  db.js             Postgres pool + query helpers + migrate()
  migrate.js seed.js seed-data.js
  config.js auth.js entitlements.js reference.js sports.js realtime.js
  routes/           auth, events, saved, polls, content, chat, scores, billing
```

## API summary

`/api/health` · `/api/auth/{register,login,me}` · `/api/events` (+`/:id`, `/:id/react`)
· `/api/saved/:id` · `/api/polls` (+`/:id/vote`) · `/api/countries` · `/api/schedule`
· `/api/lineups/:country?` · `/api/chat/:country` (GET history `?after=<id>`, POST)
· `/api/scores?sport=` (live ESPN data) · `/api/billing/{config,checkout,dev-unlock,webhook}`

## Notes

- **Sports** are real and live (ESPN), cached 60s server-side. The seeded `/api/schedule`
  and `/api/lineups` remain for the country-centric Fan Hub view.
- **Payments**: without Stripe keys, "Unlock all" uses `/api/billing/dev-unlock`. Add
  `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` to enable real checkout.
- **Source exposure**: with `framework:null`, files under `src/` are also reachable as
  static assets on Vercel. No secrets live in source (they're in env vars), but bundle
  the function later if you want to hide server source.
