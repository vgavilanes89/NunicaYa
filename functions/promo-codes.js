/**
 * Listing fee promo / discount codes (housing + extra photos).
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { isStripeLive } = require("./stripe-mode");
const { requireAccount, requireVerifiedAccount } = require("./auth-guards");

const db = admin.firestore();

/**
 * Built-in codes: none since go-live. Codes are created from the admin page
 * (adminUpsertPromoCode); nothing is auto-seeded or re-activated.
 */
const DEFAULT_PROMO_CODES = {};

/** Demo-era default codes (published in the public repo); permanently refused. */
const RETIRED_PROMO_CODES = new Set([
  "NUNCIAFREE",
  "NUNCIAFREEALL",
  "HOUSING50",
  "HOUSING25",
  "PHOTOS50",
]);

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function normalizeProductType(productType) {
  const t = String(productType || "").trim();
  if (t === "realestate") return "housing_listing";
  return t;
}

function normalizeProductTypes(productTypes) {
  if (Array.isArray(productTypes)) {
    return productTypes.map((t) => normalizeProductType(t)).filter(Boolean);
  }
  if (typeof productTypes === "string" && productTypes.trim()) {
    return productTypes.split(",").map((t) => normalizeProductType(t.trim())).filter(Boolean);
  }
  return [];
}

function applyDiscount(amountCents, discountPercent) {
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountCents = Math.round(amountCents * pct / 100);
  const finalAmountCents = Math.max(0, amountCents - discountCents);
  return { finalAmountCents, discountCents, discountPercent: pct };
}

let defaultPromosEnsured = false;

async function ensureDefaultPromoCodesInFirestore() {
  if (defaultPromosEnsured) return;
  for (const [id, def] of Object.entries(DEFAULT_PROMO_CODES)) {
    const ref = db.collection("promo-codes").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        ...def,
        code: id,
        useCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        seeded: true,
        autoSeeded: true,
      });
      continue;
    }
    const data = snap.data() || {};
    const types = normalizeProductTypes(data.productTypes);
    const needsRepair = types.length === 0 || data.discountPercent == null;
    if (needsRepair) {
      await ref.set({
        code: id,
        label: data.label || def.label,
        discountPercent: def.discountPercent,
        productTypes: def.productTypes,
        active: true,
        maxUses: data.maxUses != null ? data.maxUses : def.maxUses,
        maxUsesPerUser: data.maxUsesPerUser != null ? data.maxUsesPerUser : def.maxUsesPerUser,
        useCount: data.useCount || 0,
        repairedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
  defaultPromosEnsured = true;
}

async function loadPromoCode(code) {
  const id = normalizeCode(code);
  if (!id || RETIRED_PROMO_CODES.has(id)) return null;
  await ensureDefaultPromoCodesInFirestore();
  const snap = await db.collection("promo-codes").doc(id).get();
  if (snap.exists) {
    const data = snap.data() || {};
    const defaultDef = DEFAULT_PROMO_CODES[id];
    let productTypes = normalizeProductTypes(data.productTypes);
    if (productTypes.length === 0 && defaultDef) {
      productTypes = defaultDef.productTypes;
    }
    return {
      id,
      ...data,
      productTypes,
      discountPercent: data.discountPercent != null
        ? data.discountPercent
        : (defaultDef && defaultDef.discountPercent),
    };
  }
  const fallback = DEFAULT_PROMO_CODES[id];
  if (!fallback) return null;
  const data = {
    ...fallback,
    code: id,
    useCount: 0,
    seeded: true,
    autoSeeded: true,
  };
  await db.collection("promo-codes").doc(id).set({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { id, ...data };
}

async function countUserRedemptions(userId, codeId, productType) {
  try {
    const snap = await db.collection("promo-redemptions")
      .where("userId", "==", userId)
      .get();
    return snap.docs.filter((doc) => {
      const data = doc.data();
      return data.code === codeId && data.productType === productType;
    }).length;
  } catch (err) {
    console.error("countUserRedemptions failed:", err);
    return 0;
  }
}

async function validatePromoForUser(code, productType, userId) {
  const normalizedProduct = normalizeProductType(productType);
  const promo = await loadPromoCode(code);
  if (!promo || promo.active === false) {
    return { valid: false, reason: "invalid", productType: normalizedProduct };
  }

  if (promo.expiresAt) {
    const expMs = promo.expiresAt.toMillis ? promo.expiresAt.toMillis() : promo.expiresAt;
    if (expMs && expMs < Date.now()) {
      return { valid: false, reason: "expired", productType: normalizedProduct };
    }
  }

  const types = normalizeProductTypes(promo.productTypes);
  if (!types.includes(normalizedProduct)) {
    return {
      valid: false,
      reason: "wrong_product",
      productType: normalizedProduct,
      allowedProducts: types,
    };
  }

  if (promo.maxUses != null && (promo.useCount || 0) >= promo.maxUses) {
    return { valid: false, reason: "max_uses" };
  }

  // null maxUsesPerUser = unlimited per user
  if (promo.maxUsesPerUser != null) {
    const userUses = await countUserRedemptions(userId, promo.id, normalizedProduct);
    if (userUses >= promo.maxUsesPerUser) {
      return { valid: false, reason: "already_used" };
    }
  }

  const discountPercent = Math.min(100, Math.max(0, promo.discountPercent || 0));
  return {
    valid: true,
    code: promo.id,
    label: promo.label || promo.id,
    discountPercent,
    free: discountPercent >= 100,
  };
}

async function recordRedemption({
  userId,
  codeId,
  productType,
  originalAmountCents,
  finalAmountCents,
  discountPercent,
  free,
  paymentSessionId,
}) {
  const promoRef = db.collection("promo-codes").doc(codeId);
  const redemptionRef = db.collection("promo-redemptions").doc();

  await db.runTransaction(async (tx) => {
    const promoSnap = await tx.get(promoRef);
    if (!promoSnap.exists) {
      throw new Error("Promo code no longer exists.");
    }
    const promo = promoSnap.data();
    if (promo.maxUses != null && (promo.useCount || 0) >= promo.maxUses) {
      throw new Error("Promo code has reached its usage limit.");
    }

    tx.set(redemptionRef, {
      userId,
      code: codeId,
      productType,
      originalAmountCents,
      finalAmountCents,
      discountPercent,
      free: !!free,
      paymentSessionId: paymentSessionId || null,
      redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.set(promoRef, {
      useCount: admin.firestore.FieldValue.increment(1),
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return redemptionRef.id;
}

async function assertAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
  }
  const adminDoc = await db.collection("admins").doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Admin access required.");
  }
  return context.auth.uid;
}

const validatePromoCode = functions.https.onCall(async (data, context) => {
  requireAccount(context, "Sign in to use a discount code.");

  const code = data && data.code;
  const productType = normalizeProductType(data && data.productType);
  const originalAmountCents = data && data.originalAmountCents;

  if (!code || !productType) {
    throw new functions.https.HttpsError("invalid-argument", "code and productType are required.");
  }

  try {
    await ensureDefaultPromoCodesInFirestore();
    const result = await validatePromoForUser(code, productType, context.auth.uid);
    if (!result.valid) {
      return {
        valid: false,
        reason: result.reason,
        productType: result.productType || productType,
        allowedProducts: result.allowedProducts || null,
      };
    }

    let pricing = null;
    if (typeof originalAmountCents === "number") {
      pricing = applyDiscount(originalAmountCents, result.discountPercent);
    }

    return {
      valid: true,
      code: result.code,
      label: result.label,
      discountPercent: result.discountPercent,
      free: result.free,
      ...pricing,
    };
  } catch (err) {
    console.error("validatePromoCode failed:", err);
    throw new functions.https.HttpsError("internal", err.message || "Promo validation failed.");
  }
});

/**
 * Redeem a 100% off code — grants entitlement without Stripe.
 */
const redeemPromoCode = functions.https.onCall(async (data, context) => {
  await requireVerifiedAccount(context, "Sign in to redeem a code.");

  const code = data && data.code;
  const productType = normalizeProductType(data && data.productType);
  const originalAmountCents = (data && data.originalAmountCents) || 0;

  if (!code || !productType) {
    throw new functions.https.HttpsError("invalid-argument", "code and productType are required.");
  }

  try {
    await ensureDefaultPromoCodesInFirestore();
  } catch (seedErr) {
    console.error("ensureDefaultPromoCodesInFirestore failed:", seedErr);
  }

  const result = await validatePromoForUser(code, productType, context.auth.uid);
  if (!result.valid) {
    throw new functions.https.HttpsError("failed-precondition", result.reason || "invalid");
  }
  if (!result.free) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "This code requires payment. Use checkout with the applied discount.",
    );
  }

  const pricing = applyDiscount(originalAmountCents, result.discountPercent);
  const redemptionId = await recordRedemption({
    userId: context.auth.uid,
    codeId: result.code,
    productType,
    originalAmountCents,
    finalAmountCents: pricing.finalAmountCents,
    discountPercent: result.discountPercent,
    free: true,
    paymentSessionId: null,
  });

  // One payment record per redemption: createListing consumes it, so it pays for exactly one ad.
  const paymentId = `promo_${redemptionId}`;
  await db.collection("payments").doc(paymentId).set({
    userId: context.auth.uid,
    productType,
    status: "paid",
    amountCents: 0,
    currency: "usd",
    promoCode: result.code,
    discountPercent: result.discountPercent,
    promoRedemptionId: redemptionId,
    livemode: isStripeLive(),
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    source: "promo_free",
  });

  return {
    redeemed: true,
    paymentId,
    productType,
    promoCode: result.code,
    free: true,
  };
});

const adminListPromoCodes = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const snap = await db.collection("promo-codes").orderBy("code").get();
  return {
    codes: snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      retired: RETIRED_PROMO_CODES.has(doc.id),
      expiresAt: doc.data().expiresAt && doc.data().expiresAt.toMillis
        ? doc.data().expiresAt.toMillis()
        : null,
    })),
  };
});

const adminSeedPromoCodes = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  let created = 0;
  let skipped = 0;
  for (const [id, def] of Object.entries(DEFAULT_PROMO_CODES)) {
    const ref = db.collection("promo-codes").doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      skipped += 1;
      continue;
    }
    await ref.set({
      ...def,
      code: id,
      useCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      seeded: true,
    });
    created += 1;
  }
  return { created, skipped, codes: Object.keys(DEFAULT_PROMO_CODES) };
});

const adminUpsertPromoCode = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const code = normalizeCode(data && data.code);
  if (!code) {
    throw new functions.https.HttpsError("invalid-argument", "code is required.");
  }
  if (RETIRED_PROMO_CODES.has(code)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "This code name is retired (it was public during the demo). Choose another name.",
    );
  }

  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
    throw new functions.https.HttpsError("invalid-argument", "Code: 3–30 letters, numbers, - or _.");
  }
  const discountPercent = Number(data.discountPercent);
  if (!Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    throw new functions.https.HttpsError("invalid-argument", "Discount must be 1–100%.");
  }
  const productTypes = [...new Set(normalizeProductTypes(data.productTypes))]
    .filter((t) => t === "housing_listing" || t === "extra_images");
  if (productTypes.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Choose at least one product.");
  }
  // Empty / null = unlimited
  const optionalLimit = (v, name) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n) || n < 1) {
      throw new functions.https.HttpsError("invalid-argument", `${name} must be a positive number or empty.`);
    }
    return n;
  };
  let expiresAt = null;
  if (data.expiresAt) {
    const ms = Number(data.expiresAt);
    if (!Number.isFinite(ms) || ms <= Date.now()) {
      throw new functions.https.HttpsError("invalid-argument", "Expiry must be in the future.");
    }
    expiresAt = admin.firestore.Timestamp.fromMillis(ms);
  }

  await db.collection("promo-codes").doc(code).set({
    code,
    label: String(data.label || code).trim().slice(0, 100),
    discountPercent,
    productTypes,
    active: data.active !== false,
    maxUses: optionalLimit(data.maxUses, "Max uses"),
    maxUsesPerUser: optionalLimit(data.maxUsesPerUser, "Max uses per user"),
    expiresAt,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: context.auth.uid,
  }, { merge: true });

  return { success: true, code };
});

const adminListUserPromoRedemptions = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const userId = data && data.userId;
  if (!userId || typeof userId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "userId is required.");
  }

  const snap = await db.collection("promo-redemptions")
    .where("userId", "==", userId)
    .get();

  const redemptions = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      code: d.code || null,
      productType: d.productType || null,
      discountPercent: d.discountPercent != null ? d.discountPercent : null,
      free: !!d.free,
      finalAmountCents: d.finalAmountCents != null ? d.finalAmountCents : null,
      redeemedAt: d.redeemedAt && d.redeemedAt.toMillis ? d.redeemedAt.toMillis() : null,
    };
  }).sort((a, b) => (b.redeemedAt || 0) - (a.redeemedAt || 0));

  return { userId, redemptions };
});

const adminClearUserPromoRedemptions = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const userId = data && data.userId;
  const codeFilter = data && data.code ? normalizeCode(data.code) : null;
  const productTypeFilter = data && data.productType
    ? normalizeProductType(data.productType)
    : null;

  if (!userId || typeof userId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "userId is required.");
  }

  const snap = await db.collection("promo-redemptions")
    .where("userId", "==", userId)
    .get();

  const toDelete = snap.docs.filter((doc) => {
    const d = doc.data();
    if (codeFilter && d.code !== codeFilter) return false;
    if (productTypeFilter && d.productType !== productTypeFilter) return false;
    return true;
  });

  if (toDelete.length === 0) {
    return { deleted: 0, userId, code: codeFilter, productType: productTypeFilter };
  }

  const codeDecrements = {};
  const paymentDeletes = new Set();
  const clearedRedemptionIds = new Set(toDelete.map((doc) => doc.id));

  toDelete.forEach((doc) => {
    const d = doc.data();
    if (d.code) {
      codeDecrements[d.code] = (codeDecrements[d.code] || 0) + 1;
    }
    if (d.code && d.productType) {
      // Legacy id format (one shared record per user/code/product)
      paymentDeletes.add(`promo_${userId}_${d.code}_${d.productType}`);
    }
  });

  // Free-promo payment records for the cleared redemptions that have not paid for a listing yet
  const userPayments = await db.collection("payments").where("userId", "==", userId).get();
  userPayments.docs.forEach((doc) => {
    const p = doc.data();
    if (p.source === "promo_free" && !p.consumedByListingId
      && p.promoRedemptionId && clearedRedemptionIds.has(p.promoRedemptionId)) {
      paymentDeletes.add(doc.id);
    }
  });

  const BATCH_LIMIT = 400;
  for (let i = 0; i < toDelete.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    toDelete.slice(i, i + BATCH_LIMIT).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  for (const [codeId, count] of Object.entries(codeDecrements)) {
    const promoRef = db.collection("promo-codes").doc(codeId);
    const promoSnap = await promoRef.get();
    if (!promoSnap.exists) continue;
    const current = promoSnap.data().useCount || 0;
    const next = Math.max(0, current - count);
    await promoRef.set({
      useCount: next,
      lastClearedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastClearedBy: adminUid,
    }, { merge: true });
  }

  if (paymentDeletes.size > 0) {
    const payRefs = [...paymentDeletes];
    for (let i = 0; i < payRefs.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      payRefs.slice(i, i + BATCH_LIMIT).forEach((id) => {
        batch.delete(db.collection("payments").doc(id));
      });
      await batch.commit();
    }
  }

  return {
    deleted: toDelete.length,
    userId,
    code: codeFilter,
    productType: productTypeFilter,
    clearedCodes: Object.keys(codeDecrements),
  };
});

module.exports = {
  DEFAULT_PROMO_CODES,
  normalizeCode,
  normalizeProductType,
  applyDiscount,
  loadPromoCode,
  validatePromoForUser,
  recordRedemption,
  validatePromoCode,
  redeemPromoCode,
  adminListPromoCodes,
  adminSeedPromoCodes,
  adminUpsertPromoCode,
  adminListUserPromoRedemptions,
  adminClearUserPromoRedemptions,
};
