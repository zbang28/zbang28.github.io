import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

export const config = {
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:4000',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  // Neon / Vercel inject one of these. Falls back to the local Docker PG.
  databaseUrl:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    'postgres://postgres:dev@localhost:5433/fanhub',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  unlockPriceCents: Number(process.env.UNLOCK_PRICE_CENTS) || 500,
  // The frontend (index.html) lives at the project root in the Vercel layout.
  repoRoot: projectRoot,
  projectRoot,
};

export const stripeEnabled = Boolean(config.stripeSecretKey);
