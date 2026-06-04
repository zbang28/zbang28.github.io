import { Router } from 'express';
import Stripe from 'stripe';
import { config, stripeEnabled } from '../config.js';
import { requireAuth } from '../auth.js';
import { activateSubscription, getEntitlements } from '../entitlements.js';
import { get } from '../db.js';

export const router = Router();

const stripe = stripeEnabled ? new Stripe(config.stripeSecretKey) : null;

// Tell the frontend whether real payments are wired up.
router.get('/config', (_req, res) => {
  res.json({ stripeEnabled, priceCents: config.unlockPriceCents });
});

// Start a checkout. With Stripe configured -> returns a hosted checkout URL.
// Without Stripe -> signals dev mode so the client can call /dev-unlock.
router.post('/checkout', requireAuth, async (req, res) => {
  if (!stripeEnabled) return res.json({ devMode: true });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: String(req.user.id),
      customer_email: req.user.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: config.unlockPriceCents,
          product_data: { name: 'FanHub — unlock all boroughs' },
        },
      }],
      success_url: `${config.clientUrl}/?unlocked=1`,
      cancel_url: `${config.clientUrl}/?canceled=1`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(502).json({ error: 'Could not start checkout' });
  }
});

// Dev-only instant unlock (no Stripe keys). Disabled when Stripe is live.
router.post('/dev-unlock', requireAuth, async (req, res) => {
  if (stripeEnabled) return res.status(403).json({ error: 'Use the real checkout flow' });
  await activateSubscription(req.user.id, { source: 'dev' });
  res.json({ entitlements: await getEntitlements(req.user.id) });
});

// Stripe webhook. Mounted with a raw body in app.js, so req.body is a Buffer.
export async function webhookHandler(req, res) {
  if (!stripeEnabled) return res.status(404).end();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripeWebhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = Number(session.client_reference_id);
    const user = userId && (await get('SELECT id FROM users WHERE id = $1', [userId]));
    if (user) {
      await activateSubscription(userId, {
        source: 'purchase',
        stripeCustomerId: session.customer,
        stripeSessionId: session.id,
      });
    }
  }

  res.json({ received: true });
}

export default router;
