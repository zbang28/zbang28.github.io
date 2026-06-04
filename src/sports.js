// Real sports data via ESPN's public site API (no key required).
// Normalizes live + upcoming fixtures into a single shape the app uses.

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';

// Which ESPN scoreboards back each of our sports. Soccer aggregates several
// leagues so the World Cup theme has real global fixtures.
const SOURCES = {
  Soccer: [
    { league: 'fifa.world',        label: 'World Cup' },
    { league: 'fifa.friendly',     label: 'Intl Friendly' },
    { league: 'usa.1',             label: 'MLS' },
    { league: 'eng.1',             label: 'Premier League' },
    { league: 'esp.1',             label: 'La Liga' },
    { league: 'uefa.champions',    label: 'Champions League' },
    { path: 'soccer' },
  ],
  NBA: [{ path: 'basketball', league: 'nba', label: 'NBA' }],
  NFL: [{ path: 'football',   league: 'nfl', label: 'NFL' }],
  MLB: [{ path: 'baseball',   league: 'mlb', label: 'MLB' }],
  NHL: [{ path: 'hockey',     league: 'nhl', label: 'NHL' }],
};

// path defaults to the sport key's scoreboard family
const PATHS = { Soccer: 'soccer', NBA: 'basketball', NFL: 'football', MLB: 'baseball', NHL: 'hockey' };

const cache = new Map(); // url -> { at, data }
const TTL_MS = 60_000;

async function fetchJson(url) {
  const hit = cache.get(url);
  if (hit && (nowMs() - hit.at) < TTL_MS) return hit.data;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('ESPN ' + res.status);
    const data = await res.json();
    cache.set(url, { at: nowMs(), data });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Date.now() is fine here (server runtime, not a workflow script).
function nowMs() { return Date.now(); }

function normalizeEvent(ev, sport, leagueLabel) {
  const comp = ev.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find((c) => c.homeAway === 'home');
  const away = comp.competitors?.find((c) => c.homeAway === 'away');
  if (!home || !away) return null;
  const status = ev.status?.type || {};
  const side = (c) => ({
    name: c.team?.displayName || c.team?.name || c.team?.shortDisplayName || '',
    short: c.team?.abbreviation || '',
    logo: c.team?.logo || c.team?.logos?.[0]?.href || '',
    score: c.score ?? null,
    winner: Boolean(c.winner),
  });
  return {
    id: ev.id,
    sport,
    league: leagueLabel || ev.season?.slug || '',
    name: ev.name || `${away?.team?.displayName} at ${home?.team?.displayName}`,
    date: ev.date,
    venue: comp.venue?.fullName || '',
    state: status.state || 'pre',           // pre | in | post
    live: status.state === 'in',
    completed: Boolean(status.completed),
    statusDetail: status.shortDetail || status.detail || '',
    home: side(home),
    away: side(away),
  };
}

// Fetch normalized fixtures for one sport (live + scheduled today).
export async function getScores(sport) {
  const sources = SOURCES[sport];
  if (!sources) return [];
  const out = [];
  await Promise.all(sources.map(async (s) => {
    const path = s.path || PATHS[sport];
    const url = s.league
      ? `${ESPN}/${path}/${s.league}/scoreboard`
      : `${ESPN}/${path}/scoreboard`;
    try {
      const data = await fetchJson(url);
      for (const ev of data.events || []) {
        const n = normalizeEvent(ev, sport, s.label || data.leagues?.[0]?.name);
        if (n) out.push(n);
      }
    } catch {
      /* one league failing shouldn't kill the rest */
    }
  }));
  // De-dupe by event id, sort live first then by date.
  const seen = new Set();
  return out
    .filter((e) => (seen.has(e.id) ? false : seen.add(e.id)))
    .sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      return new Date(a.date) - new Date(b.date);
    });
}

export const SUPPORTED_SPORTS = Object.keys(SOURCES);
