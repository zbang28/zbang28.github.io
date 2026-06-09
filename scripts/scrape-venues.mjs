#!/usr/bin/env node
// Scrape World Cup watch-party venues from worldcup.nyc into scripts/venues.json.
//
// ZERO COST: Node 20 built-in global `fetch` only — no paid APIs, no keys, no
// geocoding, no external deps. The source is a free static Astro site whose
// robots.txt allows all crawling.
//
// Pipeline: neighborhoods index -> 156 slugs -> first 15 venue links each ->
// dedupe globally -> fetch each venue page -> parse JSON-LD + body text.
//
// Politeness/robustness: concurrency cap, small delay, descriptive User-Agent,
// 3x retry with backoff, and a raw-HTML disk cache (scripts/.cache/) keyed by
// URL so re-runs don't re-fetch.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');
const OUT_FILE = path.join(__dirname, 'venues.json');

const BASE = 'https://www.worldcup.nyc';
const USER_AGENT =
  'fanhub-venue-scraper/1.0 (+https://zbang28githubio.vercel.app; static-site scrape, robots-allowed)';
const CONCURRENCY = 5;
const DELAY_MS = 120;            // small politeness delay between fetches
const MAX_RETRIES = 3;
const VENUES_PER_NEIGHBORHOOD = 15;
const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Fetch with disk cache + retry/backoff.
// ---------------------------------------------------------------------------
function cachePath(url) {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
  return path.join(CACHE_DIR, hash + '.html');
}

async function fetchCached(url) {
  const cp = cachePath(url);
  if (existsSync(cp)) {
    return readFile(cp, 'utf8');
  }
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      await writeFile(cp, html);
      await sleep(DELAY_MS);
      return html;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await sleep(300 * attempt * attempt); // backoff
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastErr?.message}`);
}

// Run an async worker over `items` with a fixed concurrency cap.
async function mapPool(items, worker, onProgress) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        results[i] = { __error: err.message, __item: items[i] };
      }
      done++;
      onProgress?.(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run));
  return results;
}

// ---------------------------------------------------------------------------
// Parsing helpers.
// ---------------------------------------------------------------------------
function extractJsonLd(html) {
  const blocks = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      /* ignore unparseable block */
    }
  }
  return blocks;
}

const ENTITIES = {
  '&amp;': '&', '&#38;': '&',
  '&#39;': "'", '&apos;': "'", '&rsquo;': '’', '&lsquo;': '‘',
  '&quot;': '"', '&#34;': '"', '&ldquo;': '“', '&rdquo;': '”',
  '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&bull;': '•',
};
function decodeEntities(s) {
  return s
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? e)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

// Strip a page to plain visible text (drops script/style, collapses whitespace).
function htmlToText(html) {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(t).replace(/\s+/g, ' ').trim();
}

// The venue info block is one line of "Label: value" pairs followed by footer
// boilerplate. Each value is extracted with a shape-aware pattern so a missing
// trailing label can't make a capture run on into the footer.
const LABELS = ['Address', 'Website', 'Instagram', 'Phone', 'Tags'];

// A free-text field (Address): capture up to the next known label.
function labelValue(text, label) {
  const others = LABELS.filter((l) => l !== label).join('|');
  const re = new RegExp(`${label}:\\s*(.+?)(?=\\s+(?:${others}):|$)`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() || null : null;
}

function deriveVtype(tags) {
  const set = new Set(tags.map((t) => t.toLowerCase()));
  if (set.has('rooftop')) return 'Rooftop';
  if (set.has('brewery')) return 'Brewery';
  if (set.has('restaurant')) return 'Restaurant';
  if (set.has('football-bar') || set.has('sports') || set.has('sports-bar')) return 'Sports Bar';
  return 'Bar';
}

function parseVenue(html, slug, sourceUrl) {
  const ld = extractJsonLd(html);
  const bar = ld.find((b) => b['@type'] === 'BarOrPub') || {};
  const crumb = ld.find((b) => b['@type'] === 'BreadcrumbList');

  // Neighborhood from breadcrumb (position 3 = index 2).
  let neighborhood = null;
  const crumbItem = crumb?.itemListElement?.[2];
  if (crumbItem?.name) neighborhood = crumbItem.name.trim();

  const text = htmlToText(html);

  // Name: prefer JSON-LD, fall back to <title> / first heading text.
  let name = (bar.name || '').trim() || null;

  // Address: prefer body label, fall back to JSON-LD streetAddress.
  const address = labelValue(text, 'Address') || bar.address?.streetAddress?.trim() || null;

  // Website: a single URL token. Prefer body label, fall back to JSON-LD url.
  let website = text.match(/Website:\s*(\S+)/i)?.[1]?.trim() || null;
  if (!website && bar.url && !/worldcup\.nyc/i.test(bar.url)) website = bar.url.trim();

  // Instagram: a single @handle token.
  let instagram = text.match(/Instagram:\s*(@?[A-Za-z0-9._]+)/i)?.[1]?.trim() || null;

  // Phone: phone-shaped characters only (stops naturally at the next label).
  let phone = text.match(/Phone:\s*([\d()+][\d\s()+.-]{5,})/i)?.[1]?.trim() || null;

  // Tags: a "•"-joined run of slug tokens (Tags is the last label, so bound the
  // capture to the bullet list and never spill into footer boilerplate).
  const tagsRaw = text.match(/Tags:\s*([a-z0-9-]+(?:\s*•\s*[a-z0-9-]+)*)/i)?.[1] || '';
  const tags = tagsRaw.split('•').map((t) => t.trim()).filter(Boolean);

  // Borough: "<Neighborhood>, <Borough>" / "<Neighborhood> — <Borough>" subtitle.
  let borough = null;
  if (neighborhood) {
    const esc = neighborhood.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = text.match(new RegExp(`${esc}\\s*[,\\u2014\\u2013-]\\s*(${BOROUGHS.join('|')})\\b`));
    if (m) borough = m[1];
  }
  if (!borough) {
    const m = text.match(new RegExp(`\\b(${BOROUGHS.join('|')})\\b`));
    if (m) borough = m[1];
  }

  return {
    slug,
    name,
    neighborhood,
    borough,
    address,
    website,
    instagram,
    phone,
    tags,
    vtype: deriveVtype(tags),
    source_url: sourceUrl,
  };
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------
async function main() {
  await mkdir(CACHE_DIR, { recursive: true });

  // 1. Neighborhoods index -> ordered, unique slugs.
  console.log('Fetching neighborhoods index…');
  const indexHtml = await fetchCached(`${BASE}/neighborhoods/`);
  const nbhdSlugs = [];
  const seenNbhd = new Set();
  const nbhdRe = /\/neighborhoods\/([a-z0-9-]+)/g;
  let mm;
  while ((mm = nbhdRe.exec(indexHtml))) {
    if (!seenNbhd.has(mm[1])) {
      seenNbhd.add(mm[1]);
      nbhdSlugs.push(mm[1]);
    }
  }
  console.log(`Found ${nbhdSlugs.length} neighborhoods.`);

  // 2. For each neighborhood, take first 15 venue slugs in display order.
  console.log('Fetching neighborhood pages…');
  const perNbhd = await mapPool(
    nbhdSlugs,
    async (slug) => {
      const html = await fetchCached(`${BASE}/neighborhoods/${slug}`);
      const order = [];
      const seen = new Set();
      const re = /\/venues\/([a-z0-9-]+)/g;
      let m;
      while ((m = re.exec(html))) {
        if (!seen.has(m[1])) {
          seen.add(m[1]);
          order.push(m[1]);
        }
      }
      return { slug, venueSlugs: order.slice(0, VENUES_PER_NEIGHBORHOOD) };
    },
    (d, t) => process.stdout.write(`\r  neighborhoods ${d}/${t}`)
  );
  process.stdout.write('\n');

  // 3. Dedupe venue slugs globally (a venue may sit on the border of two
  //    neighborhoods; first occurrence wins).
  const venueSlugs = [];
  const seenVenue = new Set();
  for (const n of perNbhd) {
    if (n.__error) {
      console.warn(`  ! neighborhood failed: ${n.__item} — ${n.__error}`);
      continue;
    }
    for (const v of n.venueSlugs) {
      if (!seenVenue.has(v)) {
        seenVenue.add(v);
        venueSlugs.push(v);
      }
    }
  }
  console.log(`Collected ${venueSlugs.length} unique venue slugs.`);

  // 4. Fetch + parse each venue page.
  console.log('Fetching venue pages…');
  const parsed = await mapPool(
    venueSlugs,
    async (slug) => {
      const url = `${BASE}/venues/${slug}`;
      const html = await fetchCached(url);
      return parseVenue(html, slug, url);
    },
    (d, t) => process.stdout.write(`\r  venues ${d}/${t}`)
  );
  process.stdout.write('\n');

  const venues = [];
  let failed = 0;
  for (const v of parsed) {
    if (v.__error) {
      failed++;
      console.warn(`  ! venue failed: ${v.__item} — ${v.__error}`);
      continue;
    }
    if (!v.name || !v.neighborhood || !v.borough) {
      console.warn(
        `  ! incomplete (skipped): ${v.slug} — name=${v.name} nbhd=${v.neighborhood} boro=${v.borough}`
      );
      continue;
    }
    venues.push(v);
  }

  venues.sort((a, b) =>
    (a.neighborhood || '').localeCompare(b.neighborhood || '') ||
    (a.name || '').localeCompare(b.name || '')
  );

  await writeFile(OUT_FILE, JSON.stringify(venues, null, 2) + '\n');

  // Report.
  const byNbhd = new Map();
  for (const v of venues) byNbhd.set(v.neighborhood, (byNbhd.get(v.neighborhood) || 0) + 1);
  console.log(`\n✓ Wrote ${venues.length} venues to ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log(`  neighborhoods represented: ${byNbhd.size}`);
  console.log(`  fetch failures: ${failed}`);
}

main().catch((err) => {
  console.error('\nScrape failed:', err);
  process.exit(1);
});
