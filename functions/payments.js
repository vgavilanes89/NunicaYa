/**
 * Stripe merchant services for NunciaYa (housing listing fee + extra listing photos).
 *
 * Required env (functions/.env or Cloud Functions env vars):
 *   STRIPE_SECRET_KEY=sk_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...  (from Stripe Dashboard → Webhooks)
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const promoCodes = require("./promo-codes");

const db = admin.firestore();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/** Sellable products (amounts in cents, USD). */
const PAYMENT_PRODUCTS = {
  extra_images: {
    name: "NunciaYa — Extra listing photos (up to 5 total)",
    description: "Unlock up to 5 photos for one listing.",
    amountCents: 200,
    currency: "usd",
  },
  housing_listing: {
    name: "NunciaYa — Housing listing fee",
    description: "Publish one housing ad (sale or rent) for 30 days.",
    amountCents: 500,
    currency: "usd",
  },
};

function getStripeClient() {
  if (!STRIPE_SECRET_KEY) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Payments are not configured. Set STRIPE_SECRET_KEY on Cloud Functions.",
    );
  }
  return new Stripe(STRIPE_SECRET_KEY);
}

const ALLOWED_ORIGINS = new Set([
  "https://nunciaya.com",
  "https://www.nunciaya.com",
  "https://nunciaya-web.web.app",
  "https://nunciaya-web.firebaseapp.com",
]);

function normalizeOrigin(origin) {
  if (!origin || typeof origin !== "string") {
    return "https://nunciaya.com";
  }
  const cleaned = origin.replace(/\/$/, "");
  return ALLOWED_ORIGINS.has(cleaned) ? cleaned : "https://nunciaya.com";
}

/**
 * Creates a Stripe Checkout session and a pending payment record in Firestore.
 */
const createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in to continue to payment.");
  }

  const client = getStripeClient();
  const productType = data && data.productType;
  const product = PAYMENT_PRODUCTS[productType];
  if (!product) {
    throw new functions.https.HttpsError("invalid-argument", "Unknown product type.");
  }

  const origin = normalizeOrigin(data.origin);
  const promoCodeInput = data && data.promoCode ? String(data.promoCode).trim() : "";
  let finalAmountCents = product.amountCents;
  let discountPercent = 0;
  let appliedPromoCode = null;

  if (promoCodeInput) {
    const validation = await promoCodes.validatePromoForUser(
      promoCodeInput,
      productType,
      context.auth.uid,
    );
    if (!validation.valid) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        validation.reason || "invalid_promo",
      );
    }
    if (validation.free) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This code is free — use redeemPromoCode instead of checkout.",
      );
    }
    const pricing = promoCodes.applyDiscount(product.amountCents, validation.discountPercent);
    finalAmountCents = pricing.finalAmountCents;
    discountPercent = pricing.discountPercent;
    appliedPromoCode = validation.code;
    if (finalAmountCents < 50) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Discounted amount is too low for card checkout. Use a free code or a smaller discount.",
      );
    }
  }

  // Keep the user in edit mode across the Stripe redirect when paying for an existing listing.
  const editId = data && typeof data.editId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(data.editId)
    ? data.editId
    : null;
  const editParam = editId ? `&edit_id=${editId}` : "";
  const successUrl =
    `${origin}/post-ad.html?payment=success&session_id={CHECKOUT_SESSION_ID}&product=${productType}${editParam}`;
  const cancelUrl =
    `${origin}/post-ad.html?payment=cancelled&product=${productType}${editParam}`;

  const description = appliedPromoCode
    ? `${product.description} (Promo: ${appliedPromoCode}, -${discountPercent}%)`
    : product.description;

  const session = await client.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: product.currency,
        unit_amount: finalAmountCents,
        product_data: {
          name: product.name,
          description: description,
        },
      },
    }],
    client_reference_id: context.auth.uid,
    metadata: {
      userId: context.auth.uid,
      productType: productType,
      promoCode: appliedPromoCode || "",
      discountPercent: String(discountPercent),
      originalAmountCents: String(product.amountCents),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  await db.collection("payments").doc(session.id).set({
    userId: context.auth.uid,
    productType: productType,
    status: "pending",
    amountCents: finalAmountCents,
    originalAmountCents: product.amountCents,
    discountPercent: discountPercent || null,
    promoCode: appliedPromoCode,
    currency: product.currency,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    url: session.url,
    sessionId: session.id,
    finalAmountCents,
    discountPercent,
    promoCode: appliedPromoCode,
  };
});

/**
 * Verifies a completed Checkout session after the user returns to the site.
 */
const verifyCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in to verify payment.");
  }

  const client = getStripeClient();
  const sessionId = data && data.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "sessionId is required.");
  }

  const session = await client.checkout.sessions.retrieve(sessionId);

  if (!session.metadata || session.metadata.userId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "This payment does not belong to you.");
  }

  if (session.payment_status !== "paid") {
    throw new functions.https.HttpsError("failed-precondition", "Payment has not been completed.");
  }

  const productType = session.metadata.productType;
  if (!PAYMENT_PRODUCTS[productType]) {
    throw new functions.https.HttpsError("internal", "Unknown product on completed payment.");
  }

  const promoCode = session.metadata && session.metadata.promoCode;
  const discountPercent = session.metadata && session.metadata.discountPercent
    ? Number(session.metadata.discountPercent)
    : null;
  const originalAmountCents = session.metadata && session.metadata.originalAmountCents
    ? Number(session.metadata.originalAmountCents)
    : null;

  await db.collection("payments").doc(sessionId).set({
    userId: context.auth.uid,
    productType: productType,
    status: "paid",
    amountCents: session.amount_total,
    originalAmountCents: originalAmountCents,
    discountPercent: discountPercent,
    promoCode: promoCode || null,
    currency: session.currency,
    stripePaymentIntent: session.payment_intent || null,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  if (promoCode) {
    const redemptionKey = `checkout_${sessionId}`;
    const existing = await db.collection("promo-redemptions")
      .where("paymentSessionId", "==", redemptionKey)
      .limit(1)
      .get();
    if (existing.empty) {
      await promoCodes.recordRedemption({
        userId: context.auth.uid,
        codeId: promoCode,
        productType,
        originalAmountCents: originalAmountCents || session.amount_total,
        finalAmountCents: session.amount_total,
        discountPercent: discountPercent || 0,
        free: false,
        paymentSessionId: redemptionKey,
      });
    }
  }

  return {
    paid: true,
    productType: productType,
    sessionId: sessionId,
    promoCode: promoCode || null,
  };
});

/**
 * Stripe webhook — keeps payment records in sync if the user closes the tab before verify runs.
 * Configure in Stripe Dashboard:
 *   URL: https://us-central1-nunciaya-web.cloudfunctions.net/stripeWebhook
 *   Events: checkout.session.completed
 */
const stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook called but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is missing.");
    res.status(503).send("Payments not configured");
    return;
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata && session.metadata.userId;
    const productType = session.metadata && session.metadata.productType;

    if (userId && productType && PAYMENT_PRODUCTS[productType]) {
      const promoCode = session.metadata && session.metadata.promoCode;
      const discountPercent = session.metadata && session.metadata.discountPercent
        ? Number(session.metadata.discountPercent)
        : null;
      const originalAmountCents = session.metadata && session.metadata.originalAmountCents
        ? Number(session.metadata.originalAmountCents)
        : null;

      await db.collection("payments").doc(session.id).set({
        userId: userId,
        productType: productType,
        status: "paid",
        amountCents: session.amount_total,
        originalAmountCents: originalAmountCents,
        discountPercent: discountPercent,
        promoCode: promoCode || null,
        currency: session.currency,
        stripePaymentIntent: session.payment_intent || null,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (promoCode) {
        const redemptionKey = `checkout_${session.id}`;
        const existing = await db.collection("promo-redemptions")
          .where("paymentSessionId", "==", redemptionKey)
          .limit(1)
          .get();
        if (existing.empty) {
          await promoCodes.recordRedemption({
            userId,
            codeId: promoCode,
            productType,
            originalAmountCents: originalAmountCents || session.amount_total,
            finalAmountCents: session.amount_total,
            discountPercent: discountPercent || 0,
            free: false,
            paymentSessionId: redemptionKey,
          });
        }
      }
    }
  }

  res.json({ received: true });
});

module.exports = {
  createCheckoutSession,
  verifyCheckoutSession,
  stripeWebhook,
  PAYMENT_PRODUCTS,
};
