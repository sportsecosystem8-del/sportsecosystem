const Stripe = require('stripe');

let stripe;

/** Normalize env (trim, BOM); accept standard + restricted Stripe secret keys. */
function getStripeSecretKey() {
  const raw = process.env.STRIPE_SECRET_KEY;
  if (raw == null || raw === '') return null;
  const key = String(raw).trim().replace(/^\uFEFF/, '');
  if (!key) return null;
  if (/^(sk|rk)_(test|live)_/.test(key)) return key;
  return null;
}

function getStripe() {
  const key = getStripeSecretKey();
  if (!key) return null;
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}

function isStripeEnabled() {
  return getStripeSecretKey() != null;
}

/** Major currency unit (USD/PKR) → smallest unit (cents/paisa). */
function dollarsToCents(amount) {
  const n = Number(amount);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

const majorToMinor = dollarsToCents;

async function retrieveSucceededPaymentIntent(paymentIntentId) {
  const s = getStripe();
  if (!s) {
    const err = new Error('Stripe is not configured');
    err.statusCode = 503;
    throw err;
  }
  const pi = await s.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== 'succeeded') {
    const err = new Error('Payment has not completed');
    err.statusCode = 400;
    throw err;
  }
  return pi;
}

function assertAmountMatches(pi, expectedCents) {
  const received = typeof pi.amount_received === 'number' ? pi.amount_received : pi.amount;
  if (received !== expectedCents) {
    const err = new Error('Payment amount mismatch');
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Card-only checkout: matches existing “card payment” flows and avoids Payment Element
 * trying Apple Pay / Link / etc. (dashboard activation + domain verification noise in dev).
 */
function paymentIntentMethodSpec() {
  return { payment_method_types: ['card'] };
}

module.exports = {
  getStripe,
  isStripeEnabled,
  dollarsToCents,
  majorToMinor,
  retrieveSucceededPaymentIntent,
  assertAmountMatches,
  paymentIntentMethodSpec,
};
