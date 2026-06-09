// Geocode scripts/venues.json with REAL coordinates.
//
// Source: the US Census Geocoder batch endpoint — free, no API key, no cost.
// (https://geocoding.geo.census.gov/geocoder/) It accepts up to 10,000
// addresses per request and returns Match/No_Match + lon,lat per row.
//
// Why this exists: the worldcup.nyc source pages only carry a placeholder
// lat/lng (the generic NYC center 40.7128/-74.0060), so the original scrape
// left coords null and the map placed venues at neighborhood centroids. That
// made every bar in a neighborhood land on the same spot. This fills in real
// per-venue lat/lng from each venue's street address so the map is accurate.
//
// Idempotent: caches the raw Census response to scripts/.cache so re-runs
// don't re-hit the service, and only writes lat/lng back onto venues.json.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VENUES_FILE = path.join(__dirname, 'venues.json');
const CACHE_DIR = path.join(__dirname, '.cache');
const ENDPOINT = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch';
const BATCH_SIZE = 5000; // well under the 10k cap; smaller = more resilient

// Census wants a real USPS city. For most boroughs that's the borough name;
// in Queens the post-office town is the neighborhood (Astoria, Flushing, …),
// so a second pass falls back to that for anything the first pass misses.
function cityBorough(v) {
  if (v.borough === 'Manhattan') return 'New York';
  return v.borough || 'New York';
}
function cityNeighborhood(v) {
  return v.neighborhood || cityBorough(v);
}

// Build one Census CSV row: Unique ID, Street, City, State, ZIP.
function csvRow(id, v, cityFn) {
  const cell = (s) => `"${String(s ?? '').replace(/"/g, '')}"`;
  return [cell(id), cell(v.address), cell(cityFn(v)), cell('NY'), cell('')].join(',');
}

// Census returns fully-quoted CSV. Split a line into its quoted fields.
function parseLine(line) {
  const out = [];
  const re = /"([^"]*)"/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push(m[1]);
  return out;
}

async function geocodeBatch(rows, batchIdx) {
  const cachePath = path.join(CACHE_DIR, `geocode-batch-${batchIdx}.csv`);
  try {
    const cached = await readFile(cachePath, 'utf8');
    if (cached.trim()) { console.log(`  batch ${batchIdx}: using cache`); return cached; }
  } catch { /* not cached yet */ }

  const csv = rows.join('\n') + '\n';
  const boundary = '----censusbatchboundary' + batchIdx;
  let body = `--${boundary}\r\nContent-Disposition: form-data; name="benchmark"\r\n\r\nPublic_AR_Current\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="addressFile"; filename="addr.csv"\r\n`;
  body += `Content-Type: text/csv\r\n\r\n${csv}\r\n--${boundary}--\r\n`;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      await writeFile(cachePath, text);
      return text;
    } catch (err) {
      console.log(`  batch ${batchIdx}: attempt ${attempt} failed (${err.message})`);
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  const venues = JSON.parse(await readFile(VENUES_FILE, 'utf8'));
  console.log(`Loaded ${venues.length} venues.`);

  // Only geocode rows that have a street address and no real coords yet.
  const targets = venues
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v.address && !(typeof v.lat === 'number' && typeof v.lng === 'number'));
  console.log(`${targets.length} need geocoding.`);

  const coords = new Map(); // index -> [lat, lng]

  // Each pass uses a different city strategy and only looks at rows still
  // missing coords. cacheTag keeps each pass's cached response distinct.
  async function runPass(cityFn, cacheTag) {
    const remaining = targets.filter(({ i }) => !coords.has(i));
    if (!remaining.length) return;
    for (let start = 0, b = 0; start < remaining.length; start += BATCH_SIZE, b++) {
      const slice = remaining.slice(start, start + BATCH_SIZE);
      const rows = slice.map(({ v, i }) => csvRow(i, v, cityFn));
      console.log(`Pass "${cacheTag}" batch ${b} (${slice.length} rows)…`);
      const text = await geocodeBatch(rows, `${cacheTag}-${b}`);
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        const f = parseLine(line);
        const id = Number(f[0]);
        if (f[2] === 'Match' && f[5]) {
          const [lon, lat] = f[5].split(',').map(Number);
          // Guard against the occasional wrong-state match: keep only points
          // inside the NYC bounding box, else leave null → centroid fallback.
          const inNYC = lat > 40.4 && lat < 41.0 && lon > -74.3 && lon < -73.6;
          if (Number.isFinite(lat) && Number.isFinite(lon) && inNYC) coords.set(id, [lat, lon]);
        }
      }
    }
  }

  await runPass(cityBorough, 'borough');
  await runPass(cityNeighborhood, 'neighborhood');

  let matched = 0;
  for (const [idx, [lat, lng]] of coords) {
    venues[idx].lat = Number(lat.toFixed(6));
    venues[idx].lng = Number(lng.toFixed(6));
    matched++;
  }

  await writeFile(VENUES_FILE, JSON.stringify(venues, null, 2) + '\n');
  const withCoords = venues.filter((v) => typeof v.lat === 'number').length;
  console.log(`✓ Matched ${matched} this run. ${withCoords}/${venues.length} venues now have real coords.`);
  const missing = venues.filter((v) => v.address && typeof v.lat !== 'number').length;
  if (missing) console.log(`  ${missing} addressed venues did not match (kept null → fall back to neighborhood centroid).`);
}

main().catch((err) => { console.error('Geocode failed:', err); process.exit(1); });
