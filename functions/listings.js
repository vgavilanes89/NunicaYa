/**
 * Server-side listing creation with payment enforcement.
 *
 * New listings are created through the `createListing` callable so the server can check
 * that a housing ad (or an ad with more than FREE_IMAGE_LIMIT photos) is backed by an unused
 * paid record in payments/{id}. The payment is marked consumed by the new listing in the same
 * transaction, so one payment can only ever pay for one ad.
 *
 * Edits stay as direct client writes, guarded by firestore.rules (category cannot become
 * "housing", photo count cannot exceed what the listing paid for). Unlocking extra photos on an
 * existing listing goes through `applyExtraImagesToListing`.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { isStripeLive } = require("./stripe-mode");
const { requireAccount, requireVerifiedAccount } = require("./auth-guards");

const db = admin.firestore();

const FREE_IMAGE_LIMIT = 2;
const MAX_IMAGES_PAID = 5;
const LISTING_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

/** Fields only the server may set on a listing. */
const RESERVED_FIELDS = new Set([
  "userId",
  "createdAt",
  "expiresAt",
  "publicVisibleUntil",
  "status",
  "housingPaymentId",
  "extraImagesPaymentId",
  "extraImagesPaid",
  "featured",
]);

// Keep in sync with categoryData in post-ad.html and validCategory() in firestore.rules.
const LISTING_CATEGORIES = {
  housing: ["apartments", "cabins", "landFarms", "rentalswanted", "roomsShared", "sublets",
    "realEstate", "vacationRentals"],
  forSale: ["autoParts", "carsTrucks", "electronics", "clothes", "booksMedia", "babyKids",
    "toolsGarden", "boats", "farmProduce", "furniture", "household", "motorcycles", "pets",
    "sportingGoods", "free"],
  jobs: ["adminOffice", "customerService", "hospitality", "salesMarketing", "softwareIT",
    "tourism", "generalLabor", "education", "healthcare", "construction", "agriculture"],
  services: ["automotive", "beauty", "computer", "financial", "legal", "lessons", "petCare",
    "photography", "propertyCare", "realestate_service", "skilledtrade", "cleaningMoving",
    "toursGuides", "transportTransfers"],
  community: ["activities", "classes", "conservation", "events", "localnews", "lostfound",
    "volunteers"],
  personals: ["strictlyplatonic", "womenseekingmen", "menseekingwomen", "menseekingmen",
    "womenseekingwomen"],
};

const MAX_FIELDS = 60;
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 20;

function requiredProducts(category, imageCount) {
  const products = [];
  if (category === "housing") products.push("housing_listing");
  if (imageCount > FREE_IMAGE_LIMIT) products.push("extra_images");
  return products;
}

function isPlainValue(value) {
  if (value === null) return true;
  if (typeof value === "string") return value.length <= MAX_STRING_LENGTH;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  return false;
}

/**
 * Copies the client-supplied listing into a clean object: known-safe value types only,
 * reserved fields dropped. Throws invalid-argument on anything unexpected.
 */
function sanitizeListingInput(input, uid) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new functions.https.HttpsError("invalid-argument", "listing must be an object.");
  }
  const keys = Object.keys(input);
  if (keys.length > MAX_FIELDS) {
    throw new functions.https.HttpsError("invalid-argument", "Too many listing fields.");
  }

  const clean = {};
  keys.forEach((key) => {
    if (RESERVED_FIELDS.has(key)) return;
    if (!/^[A-Za-z0-9_]{1,64}$/.test(key)) {
      throw new functions.https.HttpsError("invalid-argument", `Invalid field name: ${key}`);
    }
    const value = input[key];
    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_LENGTH || !value.every((v) => typeof v === "string" && v.length <= 2048)) {
        throw new functions.https.HttpsError("invalid-argument", `Invalid list in field: ${key}`);
      }
      clean[key] = value.slice();
      return;
    }
    if (!isPlainValue(value)) {
      throw new functions.https.HttpsError("invalid-argument", `Invalid value in field: ${key}`);
    }
    clean[key] = value;
  });

  const subCategories = Object.prototype.hasOwnProperty.call(LISTING_CATEGORIES, clean.category)
    ? LISTING_CATEGORIES[clean.category]
    : null;
  if (!subCategories || !subCategories.includes(clean.subCategory)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid category or subcategory.");
  }

  const imageUrls = clean.imageUrls || [];
  if (!Array.isArray(imageUrls)) {
    throw new functions.https.HttpsError("invalid-argument", "imageUrls must be a list.");
  }
  if (imageUrls.length > MAX_IMAGES_PAID) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `A listing can have at most ${MAX_IMAGES_PAID} images.`,
    );
  }
  // New listings may only reference images the user uploaded to their own Storage folder.
  const ownFolder = `listing-images%2F${uid}%2F`;
  imageUrls.forEach((url) => {
    if (!/^https:\/\//.test(url) || url.indexOf(ownFolder) === -1) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Images must be uploaded from your own account.",
      );
    }
  });
  clean.imageUrls = imageUrls;
  return clean;
}

function isUnusedPaymentFor(data, uid, productType) {
  return !!data
    && data.userId === uid
    && data.productType === productType
    && data.status === "paid"
    && !data.consumedByListingId
    // Test-mode records (and pre-launch promo records) never unlock live listings.
    && (!isStripeLive() || data.livemode === true);
}

/**
 * Picks the payment to consume for one product inside a transaction: the hinted id if it is
 * valid, otherwise the oldest unused paid record for this user and product.
 * Returns a DocumentReference, or null when the user has no usable payment.
 */
async function findUnusedPayment(tx, uid, productType, hintId) {
  if (typeof hintId === "string" && hintId && hintId.length <= 200 && hintId.indexOf("/") === -1) {
    const hintRef = db.collection("payments").doc(hintId);
    const hintSnap = await tx.get(hintRef);
    if (hintSnap.exists && isUnusedPaymentFor(hintSnap.data(), uid, productType)) {
      return hintRef;
    }
  }

  const snap = await tx.get(db.collection("payments").where("userId", "==", uid));
  const candidates = snap.docs
    .filter((doc) => isUnusedPaymentFor(doc.data(), uid, productType))
    .sort((a, b) => {
      const at = a.data().paidAt && a.data().paidAt.toMillis ? a.data().paidAt.toMillis() : 0;
      const bt = b.data().paidAt && b.data().paidAt.toMillis ? b.data().paidAt.toMillis() : 0;
      return at - bt;
    });
  return candidates.length ? candidates[0].ref : null;
}

function missingPaymentError(productType) {
  return new functions.https.HttpsError(
    "failed-precondition",
    `payment_required:${productType}`,
    { productType },
  );
}

/**
 * Lists which paid products the user can still spend (unused payment records).
 */
const getMyEntitlements = functions.https.onCall(async (data, context) => {
  const uid = requireAccount(context);
  const snap = await db.collection("payments").where("userId", "==", uid).get();
  const counts = { housing_listing: 0, extra_images: 0 };
  snap.docs.forEach((doc) => {
    const d = doc.data();
    if (counts[d.productType] != null && isUnusedPaymentFor(d, uid, d.productType)) {
      counts[d.productType] += 1;
    }
  });
  return {
    housing_listing: counts.housing_listing > 0,
    extra_images: counts.extra_images > 0,
    counts,
  };
});

/**
 * Creates a listing for the signed-in user, consuming the payments it requires.
 * data: { listing: {...}, payments?: { housing_listing?: sessionId, extra_images?: sessionId } }
 */
const createListing = functions.https.onCall(async (data, context) => {
  const uid = await requireVerifiedAccount(context, "Sign in to post an ad.");
  const listing = sanitizeListingInput(data && data.listing, uid);
  const hints = (data && data.payments && typeof data.payments === "object") ? data.payments : {};
  const needed = requiredProducts(listing.category, listing.imageUrls.length);

  const listingRef = db.collection("listings").doc();

  await db.runTransaction(async (tx) => {
    // All reads first (Firestore transactions require reads before writes).
    const paymentRefs = {};
    for (const productType of needed) {
      const ref = await findUnusedPayment(tx, uid, productType, hints[productType]);
      if (!ref) throw missingPaymentError(productType);
      paymentRefs[productType] = ref;
    }

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + LISTING_LIFETIME_MS);
    const doc = {
      ...listing,
      userId: uid,
      createdAt: now,
      expiresAt,
      publicVisibleUntil: expiresAt,
      status: "active",
      extraImagesPaid: !!paymentRefs.extra_images,
    };
    if (paymentRefs.housing_listing) doc.housingPaymentId = paymentRefs.housing_listing.id;
    if (paymentRefs.extra_images) doc.extraImagesPaymentId = paymentRefs.extra_images.id;

    tx.set(listingRef, doc);
    Object.values(paymentRefs).forEach((ref) => {
      tx.update(ref, {
        consumedByListingId: listingRef.id,
        consumedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  });

  return { id: listingRef.id };
});

/**
 * Unlocks up to MAX_IMAGES_PAID photos on an existing listing the user owns, consuming one
 * unused extra_images payment. No-op if the listing is already unlocked.
 * data: { listingId, paymentId? }
 */
const applyExtraImagesToListing = functions.https.onCall(async (data, context) => {
  const uid = await requireVerifiedAccount(context);
  const listingId = data && data.listingId;
  if (typeof listingId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(listingId)) {
    throw new functions.https.HttpsError("invalid-argument", "listingId is required.");
  }
  const listingRef = db.collection("listings").doc(listingId);

  return db.runTransaction(async (tx) => {
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists || listingSnap.data().userId !== uid) {
      throw new functions.https.HttpsError("permission-denied", "You do not own this listing.");
    }
    if (listingSnap.data().extraImagesPaid === true) {
      return { unlocked: true, alreadyUnlocked: true };
    }
    const paymentRef = await findUnusedPayment(tx, uid, "extra_images", data.paymentId);
    if (!paymentRef) throw missingPaymentError("extra_images");

    tx.update(listingRef, { extraImagesPaid: true, extraImagesPaymentId: paymentRef.id });
    tx.update(paymentRef, {
      consumedByListingId: listingId,
      consumedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { unlocked: true, alreadyUnlocked: false };
  });
});

module.exports = {
  FREE_IMAGE_LIMIT,
  MAX_IMAGES_PAID,
  createListing,
  applyExtraImagesToListing,
  getMyEntitlements,
};
