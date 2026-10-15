/**
 * Firebase Cloud Functions to sync data with Algolia.
 *
 * (FORCED RE-DEPLOY 7 - Reverted to v1 SDK with .env)
 */

// Import necessary modules
const functions = require("firebase-functions"); // Reverted to v1 SDK
const admin = require("firebase-admin");
const algoliasearch = require("algoliasearch");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// --- (NEW) Get Algolia config from .env variables ---
// These are set in your .env.nunciaya-web file
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY;

// --- Helper function to initialize Algolia client ---
function initializeAlgoliaClient() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_API_KEY) {
    console.warn(
      "Algolia App ID or Admin Key is missing from environment. " +
      "Functions will not sync to Algolia.",
    );
    return null;
  }
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
  return client.initIndex("listings");
}

/**
 * Guards one-off HTTP maintenance endpoints: requires "Authorization: Bearer <Firebase ID token>"
 * for a user listed in admins/{uid}. Sends the error response and returns false when not allowed.
 */
async function requireAdminRequest(req, res) {
  const header = req.get("Authorization") || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).send("Missing Authorization: Bearer <Firebase ID token>.");
    return false;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    const adminDoc = await db.collection("admins").doc(decoded.uid).get();
    if (!adminDoc.exists) {
      res.status(403).send("Admin access required.");
      return false;
    }
    return true;
  } catch (error) {
    res.status(401).send("Invalid or expired ID token.");
    return false;
  }
}

// Facets, numeric filters, sort replicas and derived price/year fields live in algolia-config.js.
const algoliaConfig = require("./algolia-config");

// --- Build a plain, JSON-safe object for Algolia (ensures title_en/title_es are always included) ---
function listingToAlgoliaObject(data, objectID) {
  const out = { objectID };
  for (const key of Object.keys(data)) {
    const v = data[key];
    if (v && typeof v.toMillis === "function") {
      out[key + "Seconds"] = Math.floor(v.toMillis() / 1000);
    } else if (v && typeof v.seconds === "number") {
      out[key + "Seconds"] = v.seconds;
    } else if (v !== undefined && v !== null && typeof v !== "function") {
      out[key] = v;
    }
  }
  // Vehicle facets must be strings so category pages can filter with year:"…" / make:"…" consistently
  ["year", "make", "model", "trim"].forEach((k) => {
    if (out[k] === undefined || out[k] === null) return;
    if (typeof out[k] === "object") return;
    const s = String(out[k]).trim();
    if (s === "") {
      delete out[k];
    } else {
      out[k] = s;
    }
  });
  if (data.createdAt && (data.createdAt.seconds != null || data.createdAt.toMillis)) {
    out.createdAtSeconds = data.createdAt.seconds != null
      ? data.createdAt.seconds
      : Math.floor(data.createdAt.toMillis() / 1000);
  }
  if (data.expiresAt && (data.expiresAt.seconds != null || data.expiresAt.toMillis)) {
    out.expiresAtSeconds = data.expiresAt.seconds != null
      ? data.expiresAt.seconds
      : Math.floor(data.expiresAt.toMillis() / 1000);
  }
  if (typeof data.locationLat === "number" && typeof data.locationLng === "number") {
    out._geoloc = { lat: data.locationLat, lng: data.locationLng };
    out.locationLat = data.locationLat;
    out.locationLng = data.locationLng;
  }
  if (typeof data.serviceRadiusKm === "number") {
    out.serviceRadiusKm = data.serviceRadiusKm;
  }
  // priceUsd (₡ and $ comparable) and yearNumber power range filters and sort replicas
  const derived = algoliaConfig.derivedSearchFields(data);
  Object.keys(derived).forEach((k) => {
    if (derived[k] != null) out[k] = derived[k];
  });
  if (out.publicVisibleUntilSeconds == null) {
    if (out.expiresAtSeconds != null) {
      out.publicVisibleUntilSeconds = out.expiresAtSeconds;
    } else if (data.status === "sold") {
      const soldAtSec = out.soldAtSeconds;
      out.publicVisibleUntilSeconds = soldAtSec
        ? soldAtSec + 48 * 60 * 60
        : 0;
    } else {
      out.publicVisibleUntilSeconds = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    }
  }
  return out;
}

// === 1. SYNC ON CREATE ===
// (Using v1 .onCreate syntax)
exports.onListingCreated = functions
  .runWith({ failurePolicy: true })
  .firestore
  .document("listings/{listingId}")
  .onCreate(async (snap, context) => {
    const algoliaIndex = initializeAlgoliaClient();
    if (!algoliaIndex) {
      console.log("Skipping Algolia sync (onCreate): Client not initialized.");
      return null;
    }

const listingData = snap.data();
    const objectID = snap.id;
    const algoliaRecord = listingToAlgoliaObject(listingData, objectID);

    console.log(`Syncing new listing to Algolia: ${objectID}`);
    try {
      await algoliaIndex.saveObject(algoliaRecord);
      console.log(`Successfully synced new listing ${objectID} to Algolia.`);
    } catch (error) {
      console.error(
        `Error syncing new listing ${objectID} to Algolia:`,
        error,
      );
    }
    return null;
  });

exports.onListingUpdated = functions
  .runWith({ failurePolicy: true })
  .firestore
  .document("listings/{listingId}")
  .onUpdate(async (change, context) => {
    const algoliaIndex = initializeAlgoliaClient();
    if (!algoliaIndex) {
      console.log("Skipping Algolia sync (onUpdate): Client not initialized.");
      return null;
    }

const newData = change.after.data();
    const objectID = change.after.id;
    const algoliaRecord = listingToAlgoliaObject(newData, objectID);

    console.log(`Syncing update to Algolia for: ${objectID}`);
    try {
      await algoliaIndex.saveObject(algoliaRecord);
      console.log(`Successfully updated listing ${objectID} in Algolia.`);
    } catch (error) {
      console.error(
        `Error updating listing ${objectID} in Algolia:`,
        error,
      );
    }
    return null;
  });

exports.onListingDeleted = functions
  .runWith({ failurePolicy: true })
  .firestore
  .document("listings/{listingId}")
  .onDelete(async (snap, context) => {
    const algoliaIndex = initializeAlgoliaClient();
    if (!algoliaIndex) {
      console.log("Skipping Algolia sync (onDelete): Client not initialized.");
      return null;
    }

    const objectID = snap.id;

    console.log(`Deleting listing from Algolia: ${objectID}`);
    try {
      await algoliaIndex.deleteObject(objectID);
      console.log(`Successfully deleted listing ${objectID} from Algolia.`);
    } catch (error) {
      console.error(
        `Error deleting listing ${objectID} from Algolia:`,
        error,
      );
    }
    return null;
  });


// === 4. ONE-TIME BACKFILL FUNCTION ===
// (Using v1 .https.onRequest syntax)
exports.backfillDatabaseToAlgolia = functions
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onRequest(async (req, res) => {
    if (!(await requireAdminRequest(req, res))) return;
    console.log("--- RUNNING BACKFILL (v1 SDK - dotenv version) ---");
    console.log(`Config check: APP_ID starts with: ${process.env.ALGOLIA_APP_ID?.substring(0, 4)}`);

    const algoliaIndex = initializeAlgoliaClient();
    if (!algoliaIndex) {
      console.error("Algolia App ID or Admin Key is missing from environment.");
      res.status(500).send("Algolia client not initialized. Check environment variables.");
      return;
    }

    console.log("Starting Algolia backfill...");

    try {
      await algoliaConfig.configureAlgoliaIndexSettings(
        algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY),
        "listings",
      );

      const snapshot = await db.collection("listings").get();

      if (snapshot.empty) {
        console.log("No listings found in Firestore. Backfill complete.");
        res.status(200).send("No listings in Firestore to backfill.");
        return;
      }

      const algoliaObjects = [];
      snapshot.forEach((doc) => {
        const listingData = doc.data();
        const objectID = doc.id;
        algoliaObjects.push(listingToAlgoliaObject(listingData, objectID));
      });

      console.log(`Backfilling ${algoliaObjects.length} objects to Algolia...`);
      const { objectIDs } = await algoliaIndex.saveObjects(algoliaObjects);

      console.log(
        `Successfully backfilled ${objectIDs.length} objects to Algolia.`,
      );
      res.status(200).send(
        `Backfill complete. Indexed ${objectIDs.length} listing(s) in Algolia.`,
      );
    } catch (error) {
      console.error("Error during Algolia backfill:", error);
      res.status(500).send(`Backfill failed: ${error.message}`);
    }
  });

// === 5. ONE-TIME: CONFIGURE ALGOLIA INDEX FACETS ===
/**
 * Ensures vehicle filters (year/make/model/trim) work on category search pages.
 * Hit once after deploy if auto filters still return no results.
 */
exports.configureAlgoliaIndex = functions.https.onRequest(async (req, res) => {
  if (!(await requireAdminRequest(req, res))) return;
  if (!ALGOLIA_APP_ID || !ALGOLIA_API_KEY) {
    res.status(500).send("Algolia client not initialized. Check environment variables.");
    return;
  }

  try {
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
    await algoliaConfig.configureAlgoliaIndexSettings(client, "listings");
    res.status(200).send("Algolia index facets, numeric filters and sort replicas configured.");
  } catch (error) {
    console.error("Error configuring Algolia index:", error);
    res.status(500).send(`Failed to configure Algolia index: ${error.message}`);
  }
});

// === 6. SCHEDULED CLEANUP FUNCTION ===
/**
 * Runs once a day to delete expired ads from Firestore and Algolia.
 * This requires the "Blaze" plan to use Cloud Scheduler.
 */
exports.deleteExpiredListings = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    console.log("Running daily cleanup for expired listings...");

    const algoliaIndex = initializeAlgoliaClient();
    if (!algoliaIndex) {
      console.error("Cannot run cleanup: Algolia client not initialized.");
      return null;
    }

    const now = admin.firestore.Timestamp.now();
    
    const expiredQuery = db.collection("listings")
      .where("expiresAt", "<=", now);

    const hiddenSoldQuery = db.collection("listings")
      .where("status", "==", "sold")
      .where("publicVisibleUntil", "<=", now);

    try {
      const [expiredSnapshot, hiddenSoldSnapshot] = await Promise.all([
        expiredQuery.get(),
        hiddenSoldQuery.get(),
      ]);

      const listingsToDelete = [];
      expiredSnapshot.forEach((doc) => {
        listingsToDelete.push({ id: doc.id, ...doc.data() });
      });

      const hiddenSoldAlgoliaIds = [];
      hiddenSoldSnapshot.forEach((doc) => {
        if (!listingsToDelete.find((item) => item.id === doc.id)) {
          hiddenSoldAlgoliaIds.push(doc.id);
        }
      });

      if (listingsToDelete.length === 0 && hiddenSoldAlgoliaIds.length === 0) {
        console.log("No expired or hidden-sold listings to process.");
        return null;
      }

      const algoliaObjectIDs = new Set(hiddenSoldAlgoliaIds);
      const firestoreBatch = db.batch();
      const storageDeletePromises = [];

      if (listingsToDelete.length > 0) {
        console.log(`Found ${listingsToDelete.length} expired listings to delete.`);
      }
      if (hiddenSoldAlgoliaIds.length > 0) {
        console.log(
          `Found ${hiddenSoldAlgoliaIds.length} sold listings to hide from public search.`,
        );
      }

      listingsToDelete.forEach((listing) => {
        firestoreBatch.delete(db.collection("listings").doc(listing.id));
        algoliaObjectIDs.add(listing.id);

        if (listing.imageUrls && listing.imageUrls.length > 0) {
          const storage = admin.storage();
          listing.imageUrls.forEach((url) => {
            try {
              const decodedUrl = decodeURIComponent(url);
              const path = decodedUrl.split("/o/")[1].split("?")[0];
              if (path) {
                storageDeletePromises.push(storage.bucket().file(path).delete());
              }
            } catch (e) {
              console.warn(`Could not parse storage URL to delete: ${url}`, e.message);
            }
          });
        }
      });

      if (algoliaObjectIDs.size > 0) {
        await algoliaIndex.deleteObjects([...algoliaObjectIDs]);
        console.log(`Removed ${algoliaObjectIDs.size} objects from Algolia.`);
      }

      if (listingsToDelete.length > 0) {
        await firestoreBatch.commit();
        console.log(`Deleted ${listingsToDelete.length} documents from Firestore.`);
      }

      await Promise.allSettled(storageDeletePromises);
      console.log(`Attempted to delete ${storageDeletePromises.length} images from Storage.`);

      return null;

    } catch (error) {
      console.error("Error during daily cleanup:", error);
      return null;
    }
  });

// === 7. ADMIN DASHBOARD API ===
const adminApi = require("./admin");
exports.getAdminStats = adminApi.getAdminStats;
exports.adminListUsers = adminApi.adminListUsers;
exports.adminUpdateUser = adminApi.adminUpdateUser;
exports.adminSetUserDisabled = adminApi.adminSetUserDisabled;
exports.adminDeleteUser = adminApi.adminDeleteUser;
exports.adminDeleteUsers = adminApi.adminDeleteUsers;
exports.adminUpdateListing = adminApi.adminUpdateListing;
exports.adminDeleteListing = adminApi.adminDeleteListing;
exports.adminUpdateHelpRequest = adminApi.adminUpdateHelpRequest;

// === 8. PAYMENTS (Stripe Checkout) ===
const payments = require("./payments");
exports.createCheckoutSession = payments.createCheckoutSession;
exports.verifyCheckoutSession = payments.verifyCheckoutSession;
exports.stripeWebhook = payments.stripeWebhook;

// === 9. REFERRALS ===
const referrals = require("./referrals");
exports.getMyReferralInfo = referrals.getMyReferralInfo;
exports.logReferralShare = referrals.logReferralShare;
exports.completeReferralSignup = referrals.completeReferralSignup;

// === 10. PROMO / DISCOUNT CODES ===
const promo = require("./promo-codes");
exports.validatePromoCode = promo.validatePromoCode;
exports.redeemPromoCode = promo.redeemPromoCode;
exports.adminListPromoCodes = promo.adminListPromoCodes;
exports.adminSeedPromoCodes = promo.adminSeedPromoCodes;
exports.adminUpsertPromoCode = promo.adminUpsertPromoCode;
exports.adminListUserPromoRedemptions = promo.adminListUserPromoRedemptions;
exports.adminClearUserPromoRedemptions = promo.adminClearUserPromoRedemptions;

// === 11. LISTING CREATION (server-enforced housing fee / extra photos) ===
const listings = require("./listings");
exports.createListing = listings.createListing;
exports.applyExtraImagesToListing = listings.applyExtraImagesToListing;
exports.getMyEntitlements = listings.getMyEntitlements;
