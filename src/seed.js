import { pool, get, run, migrate } from './db.js';
import * as data from './seed-data.js';

const reset = process.argv.includes('--reset');

async function seedableEmpty() {
  const r = await get('SELECT COUNT(*)::int AS c FROM events');
  return r.c === 0;
}

async function clearSeedTables() {
  // Wipe content tables only — never touch users/auth/billing.
  await pool.query(`
    DELETE FROM poll_votes;
    DELETE FROM poll_options;
    DELETE FROM polls;
    DELETE FROM saved_events;
    DELETE FROM event_reactions;
    DELETE FROM events;
    DELETE FROM schedule;
    DELETE FROM lineups;
    DELETE FROM chat_messages WHERE user_id IS NULL;
  `);
}

async function seed() {
  for (const e of data.events) {
    await run(`
      INSERT INTO events (sport, country, match, venue, vtype, neighborhood, borough,
        distance, time, perks, live, when_label, lat, lng, event_type, price)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    `, [
      e.sport, e.country, e.match, e.venue, e.vtype, e.neighborhood, e.borough,
      e.distance, e.time, JSON.stringify(e.perks || []), e.live ? 1 : 0, e.when,
      e.lat, e.lng, e.eventType, e.price,
    ]);
  }

  for (const p of data.polls) {
    const { row } = await run(
      'INSERT INTO polls (country, borough, question, sub, closes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [p.country, p.borough, p.question, p.sub, p.closes]
    );
    for (const o of p.options) {
      await run('INSERT INTO poll_options (poll_id, name, seed_votes) VALUES ($1,$2,$3)',
        [row.id, o.name, o.votes || 0]);
    }
  }

  for (const s of data.schedule) {
    await run(`
      INSERT INTO schedule (country, sport, home_name, home_flag, away_name, away_flag, tournament, date, venue)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [s.country, s.sport, s.home.name, s.home.flag, s.away.name, s.away.flag, s.tournament, s.date, s.venue]);
  }

  for (const [country, l] of Object.entries(data.lineups)) {
    await run('INSERT INTO lineups (country, team, formation, color, rows) VALUES ($1,$2,$3,$4,$5)',
      [country, l.team, l.formation, JSON.stringify(l.color), JSON.stringify(l.rows)]);
  }

  for (const [country, msgs] of Object.entries(data.chatMessages)) {
    for (const m of msgs) {
      await run('INSERT INTO chat_messages (country, user_id, username, msg) VALUES ($1, NULL, $2, $3)',
        [country, m.user, m.msg]);
    }
  }
}

async function main() {
  await migrate();
  if (reset) await clearSeedTables();
  if (reset || (await seedableEmpty())) {
    await seed();
    console.log('✓ Database seeded.');
  } else {
    console.log('• Database already has events — skipping seed (use --reset to force).');
  }
  const counts = {
    events: (await get('SELECT COUNT(*)::int c FROM events')).c,
    polls: (await get('SELECT COUNT(*)::int c FROM polls')).c,
    schedule: (await get('SELECT COUNT(*)::int c FROM schedule')).c,
    lineups: (await get('SELECT COUNT(*)::int c FROM lineups')).c,
    seedChats: (await get('SELECT COUNT(*)::int c FROM chat_messages WHERE user_id IS NULL')).c,
  };
  console.log('  counts:', counts);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
