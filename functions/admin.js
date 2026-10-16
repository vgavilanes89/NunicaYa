/**
 * Admin dashboard API — all callables require a document in admins/{uid}.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const {
  collectStorageDeletePromises,
  deleteListingFavorites,
  deleteUserAccount,
} = require("./account-deletion");

const db = admin.firestore();

const ONLINE_WINDOW_MS = 15 * 60 * 1000;
const MS_7D = 7 * 24 * 60 * 60 * 1000;
const MS_30D = 30 * 24 * 60 * 60 * 1000;

async function assertAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
  }
  const uid = context.auth.uid;
  const adminDoc = await db.collection("admins").doc(uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Admin access required.");
  }
  return uid;
}

async function assertCanModifyUser(adminUid, targetUserId) {
  if (!targetUserId || typeof targetUserId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "userId is required.");
  }
  if (adminUid === targetUserId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "You cannot modify your own account from the admin dashboard.",
    );
  }
  const targetAdminDoc = await db.collection("admins").doc(targetUserId).get();
  if (targetAdminDoc.exists) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Admin accounts cannot be deactivated or deleted from here.",
    );
  }
}

function tsToMillis(v) {
  if (!v) return null;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  if (v instanceof Date) return v.getTime();
  return null;
}

function serializeTimestamp(v) {
  const ms = tsToMillis(v);
  return ms != null ? ms : null;
}

/**
 * Main dashboard stats + recent activity snapshots.
 */
const getAdminStats = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);

  const now = admin.firestore.Timestamp.now();
  const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - MS_7D);
  const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - MS_30D);
  const onlineCutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - ONLINE_WINDOW_MS);

  try {
    const categoryKeys = ["housing", "forSale", "jobs", "services", "community", "personals"];

    const [
      allListingsSnap,
      usersSnap,
      recentListingsSnap,
      new30Snap,
      activeSnap,
      pendingSnap,
      soldSnap,
      newUsers30Snap,
      openHelpSnap,
      paidPaymentsSnap,
      recentPaymentsSnap,
      recentHelpSnap,
      onlineUsersSnap,
      ...categoryCounts
    ] = await Promise.all([
      db.collection("listings").count().get(),
      db.collection("users").count().get(),
      db.collection("listings").where("createdAt", ">=", thirtyDaysAgo).orderBy("createdAt", "desc").limit(50).get(),
      db.collection("listings").where("createdAt", ">=", thirtyDaysAgo).count().get(),
      db.collection("listings").where("status", "==", "active").count().get(),
      db.collection("listings").where("status", "==", "pending").count().get(),
      db.collection("listings").where("status", "==", "sold").count().get(),
      db.collection("users").where("createdAt", ">=", thirtyDaysAgo).count().get(),
      db.collection("help-requests").where("status", "==", "new").count().get(),
      db.collection("payments").where("status", "==", "paid").get(),
      db.collection("payments").orderBy("createdAt", "desc").limit(25).get(),
      db.collection("help-requests").orderBy("submittedAt", "desc").limit(25).get(),
      db.collection("users").where("lastActiveAt", ">=", onlineCutoff).orderBy("lastActiveAt", "desc").limit(50).get(),
      ...categoryKeys.map((cat) =>
        db.collection("listings").where("category", "==", cat).count().get(),
      ),
    ]);

    const byCategory = {};
    categoryKeys.forEach((cat, i) => {
      byCategory[cat] = categoryCounts[i].data().count;
    });

    const recentListings = recentListingsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title_en || d.title_es || "(no title)",
        category: d.category,
        status: d.status || "active",
        userId: d.userId || null,
        price: d.price || null,
        createdAt: serializeTimestamp(d.createdAt),
      };
    });

    const newLast7 = recentListingsSnap.docs.filter((doc) => {
      const t = doc.data().createdAt;
      return t && t.toMillis() >= sevenDaysAgo.toMillis();
    }).length;

    let totalRevenueCents = 0;
    let paidPaymentCount = 0;
    paidPaymentsSnap.forEach((doc) => {
      const d = doc.data();
      if (d.status === "paid") {
        paidPaymentCount += 1;
        totalRevenueCents += d.amountCents || 0;
      }
    });

    const paymentsByProduct = { extra_images: 0, housing_listing: 0, other: 0 };
    paidPaymentsSnap.forEach((doc) => {
      const pt = doc.data().productType;
      if (pt === "extra_images" || pt === "housing_listing") {
        paymentsByProduct[pt] += 1;
      } else {
        paymentsByProduct.other += 1;
      }
    });

    const recentPayments = recentPaymentsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        userId: d.userId,
        productType: d.productType,
        status: d.status,
        amountCents: d.amountCents,
        currency: d.currency || "usd",
        paidAt: serializeTimestamp(d.paidAt),
        createdAt: serializeTimestamp(d.createdAt),
      };
    });

    const recentHelpRequests = recentHelpSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        email: d.email,
        phone: d.phone || "",
        topic: d.topic,
        topicLabel: d.topicLabel || d.topic,
        message: d.message || "",
        status: d.status || "new",
        source: d.source || "contact",
        userId: d.userId,
        submittedAt: serializeTimestamp(d.submittedAt),
      };
    });

    const onlineUsers = onlineUsersSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        uid: doc.id,
        email: d.email || null,
        displayName: d.displayName || null,
        fullName: d.fullName || null,
        phone: d.phone || null,
        lastActiveAt: serializeTimestamp(d.lastActiveAt),
      };
    });

    return {
      generatedAt: now.toMillis(),
      totalListings: allListingsSnap.data().count,
      totalUsers: usersSnap.data().count,
      newUsersLast30Days: newUsers30Snap.data().count,
      onlineUserCount: onlineUsers.length,
      byStatus: {
        active: activeSnap.data().count,
        pending: pendingSnap.data().count,
        sold: soldSnap.data().count,
      },
      byCategory,
      newLast7Days: newLast7,
      newLast30Days: new30Snap.data().count,
      recentListings,
      payments: {
        paidCount: paidPaymentCount,
        totalRevenueCents,
        totalRevenueUsd: (totalRevenueCents / 100).toFixed(2),
        byProduct: paymentsByProduct,
        recent: recentPayments,
      },
      helpRequests: {
        openCount: openHelpSnap.data().count,
        recent: recentHelpRequests,
      },
      onlineUsers,
    };
  } catch (error) {
    console.error("getAdminStats error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * List registered users with profile + Auth metadata.
 */
const adminListUsers = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const limit = Math.min(Math.max((data && data.limit) || 100, 1), 500);
  const pageToken = data && data.pageToken;

  try {
    const listResult = await admin.auth().listUsers(limit, pageToken || undefined);
    const users = await Promise.all(
      listResult.users.map(async (authUser) => {
        const profSnap = await db.collection("users").doc(authUser.uid).get();
        const prof = profSnap.exists ? profSnap.data() : {};
        const listingsSnap = await db.collection("listings").where("userId", "==", authUser.uid).count().get();
        const isAdmin = (await db.collection("admins").doc(authUser.uid).get()).exists;
        return {
          uid: authUser.uid,
          email: authUser.email || prof.email || null,
          displayName: prof.displayName || authUser.displayName || null,
          fullName: prof.fullName || null,
          phone: prof.phone || null,
          createdAt: authUser.metadata.creationTime,
          lastSignIn: authUser.metadata.lastSignInTime,
          lastActiveAt: serializeTimestamp(prof.lastActiveAt),
          listingCount: listingsSnap.data().count,
          referralCount: prof.referralCount || 0,
          referralPoints: prof.referralPoints || 0,
          referredBy: prof.referredBy || null,
          disabled: authUser.disabled,
          isAdmin,
        };
      }),
    );

    return {
      users,
      nextPageToken: listResult.pageToken || null,
    };
  } catch (error) {
    console.error("adminListUsers error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update a user's Firestore profile (and Auth displayName when provided).
 */
const adminUpdateUser = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const userId = data && data.userId;
  if (!userId || typeof userId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "userId is required.");
  }

  const updates = {};
  if (data.displayName != null) updates.displayName = String(data.displayName).trim();
  if (data.fullName != null) updates.fullName = String(data.fullName).trim();
  if (data.phone != null) updates.phone = String(data.phone).trim();
  if (data.email != null) updates.email = String(data.email).trim();

  if (Object.keys(updates).length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "No fields to update.");
  }

  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  updates.updatedByAdmin = context.auth.uid;

  try {
    await db.collection("users").doc(userId).set(updates, { merge: true });

    if (updates.displayName) {
      await admin.auth().updateUser(userId, { displayName: updates.displayName });
    }

    return { success: true, userId, updates };
  } catch (error) {
    console.error("adminUpdateUser error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Quick listing updates (status, titles, price).
 */
const adminUpdateListing = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const listingId = data && data.listingId;
  if (!listingId || typeof listingId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "listingId is required.");
  }

  const ref = db.collection("listings").doc(listingId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "Listing not found.");
  }

  const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedByAdmin: context.auth.uid };
  const allowed = ["status", "title_en", "title_es", "price", "currency", "priceAmount", "category", "subCategory"];
  allowed.forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      updates[key] = data[key];
    }
  });

  if (data.status === "sold" && !snap.data().soldAt) {
    const soldAt = admin.firestore.Timestamp.now();
    updates.soldAt = soldAt;
    updates.publicVisibleUntil = admin.firestore.Timestamp.fromMillis(
      soldAt.toMillis() + 48 * 60 * 60 * 1000,
    );
  }

  if (Object.keys(updates).length <= 2) {
    throw new functions.https.HttpsError("invalid-argument", "No listing fields to update.");
  }

  try {
    await ref.update(updates);
    return { success: true, listingId, updates };
  } catch (error) {
    console.error("adminUpdateListing error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Permanently delete a listing (Firestore, images, favorites). Algolia sync runs via onDelete trigger.
 */
const adminDeleteListing = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const listingId = data && data.listingId;
  if (!listingId || typeof listingId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "listingId is required.");
  }

  const ref = db.collection("listings").doc(listingId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "Listing not found.");
  }

  const listing = snap.data();
  try {
    const storageDeletes = collectStorageDeletePromises(listing.imageUrls);
    const removedFavorites = await deleteListingFavorites(listingId);

    await ref.delete();

    await Promise.allSettled(storageDeletes);

    return {
      success: true,
      listingId,
      deletedImages: storageDeletes.length,
      removedFavorites,
      deletedBy: adminUid,
    };
  } catch (error) {
    console.error("adminDeleteListing error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update help request status (new → in_review → resolved).
 */
const adminUpdateHelpRequest = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const requestId = data && data.requestId;
  const status = data && data.status;
  if (!requestId) {
    throw new functions.https.HttpsError("invalid-argument", "requestId is required.");
  }
  const allowed = ["new", "in_review", "resolved"];
  if (!allowed.includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid status.");
  }

  try {
    await db.collection("help-requests").doc(requestId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedByAdmin: context.auth.uid,
    });
    return { success: true, requestId, status };
  } catch (error) {
    console.error("adminUpdateHelpRequest error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Deactivate or reactivate a user (Firebase Auth disabled flag).
 */
const adminSetUserDisabled = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const userId = data && data.userId;
  const disabled = !!(data && data.disabled);
  await assertCanModifyUser(adminUid, userId);

  try {
    await admin.auth().updateUser(userId, { disabled });
    await db.collection("users").doc(userId).set({
      disabled,
      disabledAt: disabled ? admin.firestore.FieldValue.serverTimestamp() : null,
      disabledByAdmin: disabled ? adminUid : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, userId, disabled };
  } catch (error) {
    console.error("adminSetUserDisabled error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Permanently delete a user (see account-deletion.js for what is removed and kept).
 */
const adminDeleteUser = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const userId = data && data.userId;
  await assertCanModifyUser(adminUid, userId);

  try {
    const result = await deleteUserAccount(userId);
    return {
      success: true,
      userId: result.userId,
      deletedListings: result.deletedListings,
    };
  } catch (error) {
    console.error("adminDeleteUser error:", error);
    if (error.code === "auth/user-not-found") {
      throw new functions.https.HttpsError("not-found", "User not found in Auth.");
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Permanently delete multiple users in one admin action.
 */
const adminDeleteUsers = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const userIds = data && data.userIds;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "userIds array is required.");
  }
  if (userIds.length > 50) {
    throw new functions.https.HttpsError("invalid-argument", "Maximum 50 users per batch.");
  }

  const uniqueIds = [...new Set(userIds.filter((id) => typeof id === "string" && id))];
  const deleted = [];
  const skipped = [];
  const failed = [];

  for (const userId of uniqueIds) {
    try {
      await assertCanModifyUser(adminUid, userId);
    } catch (error) {
      skipped.push({ userId, reason: error.message });
      continue;
    }

    try {
      const result = await deleteUserAccount(userId);
      deleted.push(result);
    } catch (error) {
      console.error(`adminDeleteUsers error for ${userId}:`, error);
      failed.push({
        userId,
        message: error.code === "auth/user-not-found" ? "User not found in Auth." : error.message,
      });
    }
  }

  return {
    success: failed.length === 0,
    deleted,
    skipped,
    failed,
    totalListingsRemoved: deleted.reduce((sum, r) => sum + (r.deletedListings || 0), 0),
  };
});

module.exports = {
  getAdminStats,
  adminListUsers,
  adminUpdateUser,
  adminSetUserDisabled,
  adminDeleteUser,
  adminDeleteUsers,
  adminUpdateListing,
  adminDeleteListing,
  adminUpdateHelpRequest,
};
