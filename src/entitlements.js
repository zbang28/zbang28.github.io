import { get, all, run } from './db.js';

export const ALL_BOROUGHS = ['Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Staten Island'];
export const FREE_BOROUGH = 'Brooklyn';

export async function grantBorough(userId, borough, source = 'purchase') {
  await run(
    `INSERT INTO entitlements (user_id, borough, source) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, borough) DO NOTHING`,
    [userId, borough, source]
  );
}

// Activate full access: grant every borough + mark subscription active.
export async function activateSubscription(userId, { source = 'purchase', stripeCustomerId = null, stripeSessionId = null } = {}) {
  for (const b of ALL_BOROUGHS) await grantBorough(userId, b, source);
  await run(
    `INSERT INTO subscriptions (user_id, status, stripe_customer_id, stripe_session_id, activated_at)
     VALUES ($1, 'active', $2, $3, now())
     ON CONFLICT (user_id) DO UPDATE SET
       status='active', stripe_customer_id=EXCLUDED.stripe_customer_id,
       stripe_session_id=EXCLUDED.stripe_session_id, activated_at=now()`,
    [userId, stripeCustomerId, stripeSessionId]
  );
}

export async function getEntitlements(userId) {
  const rows = await all('SELECT borough FROM entitlements WHERE user_id = $1', [userId]);
  const sub = await get('SELECT status FROM subscriptions WHERE user_id = $1', [userId]);
  return {
    boroughs: rows.map((r) => r.borough),
    subscriptionActive: sub?.status === 'active',
  };
}

export async function hasBorough(userId, borough) {
  if (!userId) return borough === FREE_BOROUGH; // anonymous users get the free borough
  const row = await get('SELECT 1 FROM entitlements WHERE user_id = $1 AND borough = $2', [userId, borough]);
  return Boolean(row);
}
