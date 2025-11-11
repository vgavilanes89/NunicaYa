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

// === 1. SYNC ON CREATE ===
// (Using v1 .onCreate syntax)
exports.onListingCreated = functions.firestore
  .document("listings/{listingId}")
  .onCreate(async (snap, context) => {
    const algoliaIndex = initializeAlgoliaClient();
    if (!algoliaIndex) {
      console.log("Skipping Algolia sync (onCreate): Client not initialized.");
      return null;
    }

    const listingData = snap.data();
    const objectID = snap.id;

    // --- NEW: Add expiry in seconds for Algolia ---
    if (listingData.expiresAt && listingData.expiresAt.seconds) {
      listingData.expiresAtSeconds = listingData.expiresAt.seconds;
    }
    if (listingData.createdAt && listingData.createdAt.seconds) {
      listingData.createdAtSeconds = listingData.createdAt.seconds;
    }

    console.log(`Syncing new listing to Algolia: ${objectID}`);
    try {
      await algoliaIndex.saveObject({ ...listingData, objectID });
      console.log(`Successfully synced new listing ${objectID} to Algolia.`);
    } catch (error) {
      console.error(
        `Error syncing new listing ${objectID} to Algolia:`,
        error,
      );
    }
    return null;
  });

// === 2. SYNC ON UPDATE ===
// (Using v1 .onUpdate syntax)
exports.onListingUpdated = functions.firestore
  .document("listings/{listingId}")
  .onUpdate(async (change, context) => {
    const algoliaIndex = initializeAlgoliaClient();
    if (!algoliaIndex) {
      console.log("Skipping Algolia sync (onUpdate): Client not initialized.");
      return null;
    }

    const newData = change.after.data();
    const objectID = change.after.id;

    // --- NEW: Add expiry in seconds for Algolia ---
    if (newData.expiresAt && newData.expiresAt.seconds) {
      newData.expiresAtSeconds = newData.expiresAt.seconds;
    }
    if (newData.createdAt && newData.createdAt.seconds) {
      newData.createdAtSeconds = newData.createdAt.seconds;
    }

    console.log(`Syncing update to Algolia for: ${objectID}`);
    try {
      await algoliaIndex.saveObject({ ...newData, objectID });
      console.log(`Successfully updated listing ${objectID} in Algolia.`);
    } catch (error) {
      console.error(
        `Error updating listing ${objectID} in Algolia:`,
        error,
      );
    }
    return null;
  });

// === 3. SYNC ON DELETE ===
// (Using v1 .onDelete syntax)
exports.onListingDeleted = functions.firestore
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
exports.backfillDatabaseToAlgolia = functions.https.onRequest(
  async (req, res) => {
    console.log("--- RUNNING BACKFILL (v1 SDK - dotenv version) ---");
    console.log(`Config check: APP_ID starts with: ${process.env.ALGOLIA_APP_ID?.substring(0, 4)}`);

    const algoliaIndex = initializeAlgoliaClient();
    if (!algoliaIndex) {
      console.error("Algolia App ID or Admin Key is missing from environment.");
      res.status(500).send("Algolia client not initialized. Check environment variables.");
      return;
    }

    console.log("Starting Algolia backfill...");
    res.status(200).send("Backfill started. Check logs for progress.");

    try {
      const snapshot = await db.collection("listings").get();

      if (snapshot.empty) {
        console.log("No listings found in Firestore. Backfill complete.");
        return;
      }

      const algoliaObjects = [];
      snapshot.forEach((doc) => {
        const listingData = doc.data();
        const objectID = doc.id;

        // --- NEW: Add expiry and created time in seconds ---
        if (listingData.createdAt && listingData.createdAt.seconds) {
          listingData.createdAtSeconds = listingData.createdAt.seconds;
        }
        if (listingData.expiresAt && listingData.expiresAt.seconds) {
          listingData.expiresAtSeconds = listingData.expiresAt.seconds;
        }
        // ---
        
        algoliaObjects.push({ ...listingData, objectID });
      });

      console.log(`Backfilling ${algoliaObjects.length} objects to Algolia...`);
      // Clear existing index before backfilling
      await algoliaIndex.clearObjects();
      console.log("Cleared existing Algolia index.");
      
      const { objectIDs } = await algoliaIndex.saveObjects(algoliaObjects);
      
      console.log(
        `Successfully backfilled ${objectIDs.length} objects to Algolia.`,
      );
    } catch (error) {
      console.error("Error during Algolia backfill:", error);
    }
  },
);

// === 5. NEW: SCHEDULED CLEANUP FUNCTION ===
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
    
    // 1. Find all ads where 'expiresAt' or 'deleteAt' is in the past
    const expiredQuery = db.collection("listings")
      .where("expiresAt", "<=", now);
      
    const soldQuery = db.collection("listings")
      .where("deleteAt", "<=", now);

    try {
      const [expiredSnapshot, soldSnapshot] = await Promise.all([
        expiredQuery.get(),
        soldQuery.get()
      ]);

      const listingsToDelete = [];
      expiredSnapshot.forEach((doc) => {
        listingsToDelete.push({ id: doc.id, ...doc.data() });
      });
      soldSnapshot.forEach((doc) => {
        // Avoid duplicates if an ad is both 'sold' and 'expired'
        if (!listingsToDelete.find(item => item.id === doc.id)) {
          listingsToDelete.push({ id: doc.id, ...doc.data() });
        }
      });

      if (listingsToDelete.length === 0) {
        console.log("No expired listings found to delete.");
        return null;
      }

      console.log(`Found ${listingsToDelete.length} listings to delete.`);

      const algoliaObjectIDs = [];
      const firestoreBatch = db.batch();
      const storageDeletePromises = [];

      listingsToDelete.forEach((listing) => {
        // 1. Add to Firestore batch delete
        firestoreBatch.delete(db.collection("listings").doc(listing.id));
        
        // 2. Add to Algolia object ID list
        algoliaObjectIDs.push(listing.id);

        // 3. (Optional) Delete associated images from Storage
        if (listing.imageUrls && listing.imageUrls.length > 0) {
          const storage = admin.storage();
          listing.imageUrls.forEach(url => {
            try {
              // Get path from URL
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

      // --- Execute all deletions ---
      
      // 1. Delete from Algolia
      await algoliaIndex.deleteObjects(algoliaObjectIDs);
      console.log(`Deleted ${algoliaObjectIDs.length} objects from Algolia.`);
      
      // 2. Delete from Firestore
      await firestoreBatch.commit();
      console.log(`Deleted ${listingsToDelete.length} documents from Firestore.`);

      // 3. Delete from Storage
      await Promise.allSettled(storageDeletePromises);
      console.log(`Attempted to delete ${storageDeletePromises.length} images from Storage.`);
      
      return null;

    } catch (error) {
      console.error("Error during daily cleanup:", error);
      return null;
    }
  });