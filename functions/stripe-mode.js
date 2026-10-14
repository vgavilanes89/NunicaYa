/**
 * Which Stripe mode Cloud Functions run in, from the configured secret key.
 * Payment records store `livemode`; in live mode only live records are spendable,
 * so leftover test-mode payments can never unlock real listings.
 */
function isStripeLive() {
  return /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || "");
}

module.exports = { isStripeLive };
