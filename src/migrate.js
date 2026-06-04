import { pool, migrate } from './db.js';

migrate()
  .then(() => { console.log('✓ Migrations applied.'); return pool.end(); })
  .catch((e) => { console.error(e); process.exit(1); });
