// Import scripts/venues.json into the `venues` table. Idempotent and
// re-runnable: runs migrate() then UPSERTs each row on its unique slug.
//
// Local dev uses the Docker PG on :5433; prod uses Neon via DATABASE_URL.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, migrate, run, get } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VENUES_FILE = path.join(__dirname, 'venues.json');

async function main() {
  const venues = JSON.parse(await readFile(VENUES_FILE, 'utf8'));
  console.log(`Loaded ${venues.length} venues from ${path.basename(VENUES_FILE)}.`);

  await migrate();

  let upserts = 0;
  for (const v of venues) {
    await run(
      `INSERT INTO venues
         (slug, name, neighborhood, borough, address, website, instagram, phone, vtype, tags, source_url, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (slug) DO UPDATE SET
         name         = EXCLUDED.name,
         neighborhood = EXCLUDED.neighborhood,
         borough      = EXCLUDED.borough,
         address      = EXCLUDED.address,
         website      = EXCLUDED.website,
         instagram    = EXCLUDED.instagram,
         phone        = EXCLUDED.phone,
         vtype        = EXCLUDED.vtype,
         tags         = EXCLUDED.tags,
         source_url   = EXCLUDED.source_url,
         lat          = EXCLUDED.lat,
         lng          = EXCLUDED.lng`,
      [
        v.slug,
        v.name,
        v.neighborhood ?? null,
        v.borough ?? null,
        v.address ?? null,
        v.website ?? null,
        v.instagram ?? null,
        v.phone ?? null,
        v.vtype ?? null,
        JSON.stringify(Array.isArray(v.tags) ? v.tags : []),
        v.source_url ?? null,
        typeof v.lat === 'number' ? v.lat : null,
        typeof v.lng === 'number' ? v.lng : null,
      ]
    );
    upserts++;
    if (upserts % 250 === 0) process.stdout.write(`\r  upserted ${upserts}/${venues.length}`);
  }
  process.stdout.write(`\r  upserted ${upserts}/${venues.length}\n`);

  const { count } = await get('SELECT COUNT(*)::int AS count FROM venues');
  console.log(`✓ venues table now holds ${count} rows.`);
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
