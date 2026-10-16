/**
 * Account deletion, shared by the admin dashboard (adminDeleteUser/adminDeleteUsers) and
 * self-service deletion from the profile page (deleteMyAccount).
 *
 * Removes the user's listings (and their images and other users' favorites of them), every
 * file the user uploaded, their favorites, profile, referral records holding their email,
 * and the Auth account. Listing deletes also clear Algolia via the onListingDeleted trigger.
 *
 * Kept on purpose: payments/ and promo-redemptions/ (accounting records of what was paid),
 * and referrer point totals already earned.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { requireAccount } = require("./auth-guards");

const db = admin.firestore();

/** A user must have signed in this recently to delete their own account. */
const RECENT_LOGIN_SECONDS = 5 * 60;

function collectStorageDeletePromises(imageUrls) {
  const promises = [];
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) return promises;

  const storage = admin.storage();
  imageUrls.forEach((url) => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const path = decodedUrl.split("/o/")[1].split("?")[0];
      if (path) {
        promises.push(storage.bucket().file(path).delete());
      }
    } catch (e) {
      console.warn(`Could not parse storage URL to delete: ${url}`, e.message);
    }
  });
  return promises;
}

async function deleteListingFavorites(listingId) {
  try {
    const snap = await db.collectionGroup("favorites")
      .where(admin.firestore.FieldPath.documentId(), "==", listingId)
      .get();
    if (snap.empty) return 0;

    const batchSize = 400;
    let deleted = 0;
    for (let i = 0; i < snap.docs.length; i += batchSize) {
      const batch = db.batch();
      snap.docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += Math.min(batchSize, snap.docs.length - i);
    }
    return deleted;
  } catch (e) {
    console.warn("deleteListingFavorites skipped:", e.message);
    return 0;
  }
}

async function deleteUserFavorites(userId) {
  const favSnap = await db.collection("users").doc(userId).collection("favorites").get();
  if (favSnap.empty) return;

  const batch = db.batch();
  favSnap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

/** Listings with their images (incl. legacy paths outside the user's folder) and favorites. */
async function deleteUserListings(userId) {
  const listingsSnap = await db.collection("listings").where("userId", "==", userId).get();
  if (listingsSnap.empty) return 0;

  const docs = listingsSnap.docs;
  for (const doc of docs) {
    await Promise.allSettled(collectStorageDeletePromises(doc.data().imageUrls));
    await deleteListingFavorites(doc.id);
  }

  const batchSize = 400;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  return docs.length;
}

async function deleteStoragePrefix(prefix) {
  try {
    await admin.storage().bucket().deleteFiles({ prefix, force: true });
  } catch (e) {
    console.warn(`Could not delete storage prefix ${prefix}:`, e.message);
  }
}

async function deleteUserAccount(userId) {
  const deletedListings = await deleteUserListings(userId);
  // Every upload, including images that never made it onto an ad
  await deleteStoragePrefix(`listing-images/${userId}/`);
  await deleteStoragePrefix(`users/${userId}/`);
  await deleteUserFavorites(userId);
  await Promise.all([
    db.collection("referral-pending").doc(userId).delete(),
    db.collection("referrals").doc(userId).delete(), // who referred them; stores their email
    db.collection("users").doc(userId).delete(),
  ]);
  await admin.auth().deleteUser(userId);
  return { userId, deletedListings };
}

/**
 * Lets a signed-in user delete their own account. The client re-enters the password first,
 * so the token's auth_time is recent; admins are removed by another admin instead.
 */
const deleteMyAccount = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    const uid = requireAccount(context, "Sign in to delete your account.");
    const authTime = Number(context.auth.token.auth_time) || 0;
    if (Date.now() / 1000 - authTime > RECENT_LOGIN_SECONDS) {
      throw new functions.https.HttpsError("failed-precondition", "requires-recent-login");
    }
    if ((await db.collection("admins").doc(uid).get()).exists) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Admin accounts must be removed by another admin.",
      );
    }

    try {
      const result = await deleteUserAccount(uid);
      console.log(`User ${uid} deleted their account (${result.deletedListings} listings).`);
      return { deleted: true, deletedListings: result.deletedListings };
    } catch (error) {
      console.error("deleteMyAccount error:", error);
      throw new functions.https.HttpsError("internal", "Could not delete the account. Please try again.");
    }
  });

module.exports = {
  collectStorageDeletePromises,
  deleteListingFavorites,
  deleteUserAccount,
  deleteMyAccount,
};
