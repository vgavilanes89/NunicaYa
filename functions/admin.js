/**
 * Admin dashboard API — all callables require a document in admins/{uid}.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { AggregateField } = require("firebase-admin/firestore");

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

// Same formats the Firestore rules accept for users/{uid}.phone / .contactEmail
const CONTACT_PHONE_RE = /^[+]?[0-9][0-9 ()-]{6,19}$/;
const CONTACT_EMAIL_RE = /^[^@ ]+@[^@ ]+[.][^@ ]+$/;

async function runInChunks(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  }
  return out;
}

/** Applies `patchFor(listingData)` to every listing a user owns, in batches. Returns count. */
async function updateUserListings(userId, patchFor) {
  const snap = await db.collection("listings").where("userId", "==", userId).get();
  let updated = 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    snap.docs.slice(i, i + 400).forEach((doc) => {
      const patch = patchFor(doc.data());
      if (patch && Object.keys(patch).length) {
        batch.update(doc.ref, patch);
        updated += 1;
      }
    });
    await batch.commit();
  }
  return updated;
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

/** uid → email for up to a few hundred uids (missing/deleted users are skipped). */
async function emailsForUids(uids) {
  const unique = [...new Set(uids.filter((u) => typeof u === "string" && u))];
  const map = {};
  for (let i = 0; i < unique.length; i += 100) {
    const res = await admin.auth().getUsers(unique.slice(i, i + 100).map((uid) => ({ uid })));
    res.users.forEach((u) => { map[u.uid] = u.email || null; });
  }
  return map;
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
    const livePaid = db.collection("payments").where("status", "==", "paid").where("livemode", "==", true);

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
      revenueSnap,
      extraImagesPaidSnap,
      housingPaidSnap,
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
      // Live payments only (test-mode records from before launch have no livemode: true)
      livePaid.aggregate({ total: AggregateField.sum("amountCents"), count: AggregateField.count() }).get(),
      livePaid.where("productType", "==", "extra_images").count().get(),
      livePaid.where("productType", "==", "housing_listing").count().get(),
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

    const totalRevenueCents = revenueSnap.data().total || 0;
    const paidPaymentCount = revenueSnap.data().count || 0;
    const paymentsByProduct = {
      extra_images: extraImagesPaidSnap.data().count,
      housing_listing: housingPaidSnap.data().count,
    };

    const recentPayments = recentPaymentsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        userId: d.userId,
        productType: d.productType,
        status: d.status,
        amountCents: d.amountCents,
        currency: d.currency || "usd",
        livemode: d.livemode === true,
        source: d.source || "stripe",
        promoCode: d.promoCode || null,
        consumedByListingId: d.consumedByListingId || null,
        paidAt: serializeTimestamp(d.paidAt),
        createdAt: serializeTimestamp(d.createdAt),
      };
    });
    const payerEmails = await emailsForUids(recentPayments.map((p) => p.userId));
    recentPayments.forEach((p) => { p.userEmail = payerEmails[p.userId] || null; });

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
 * List registered users with profile + Auth metadata. Anonymous sessions (created for every
 * visitor of a category page) are not accounts and are skipped; up to 10 Auth pages are scanned
 * per call to collect at least `limit` accounts.
 */
const adminListUsers = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const limit = Math.min(Math.max((data && data.limit) || 100, 1), 500);
  let pageToken = (data && data.pageToken) || undefined;

  try {
    const accounts = [];
    let anonymousSkipped = 0;
    for (let i = 0; i < 10 && accounts.length < limit; i++) {
      const page = await admin.auth().listUsers(1000, pageToken);
      page.users.forEach((u) => {
        if (u.providerData.length === 0) anonymousSkipped += 1;
        else accounts.push(u);
      });
      pageToken = page.pageToken;
      if (!pageToken) break;
    }

    const profileRefs = accounts.map((u) => db.collection("users").doc(u.uid));
    const adminRefs = accounts.map((u) => db.collection("admins").doc(u.uid));
    const [profiles, adminDocs] = await Promise.all([
      profileRefs.length ? db.getAll(...profileRefs) : [],
      adminRefs.length ? db.getAll(...adminRefs) : [],
    ]);
    const listingCounts = await runInChunks(accounts, 50, (u) =>
      db.collection("listings").where("userId", "==", u.uid).count().get().then((c) => c.data().count));

    const users = accounts.map((authUser, i) => {
      const prof = profiles[i] && profiles[i].exists ? profiles[i].data() : {};
      return {
        uid: authUser.uid,
        email: authUser.email || prof.email || null,
        emailVerified: authUser.emailVerified === true,
        displayName: prof.displayName || authUser.displayName || null,
        fullName: prof.fullName || null,
        phone: prof.phone || null,
        contactEmail: prof.contactEmail || null,
        createdAt: authUser.metadata.creationTime,
        lastSignIn: authUser.metadata.lastSignInTime,
        lastActiveAt: serializeTimestamp(prof.lastActiveAt),
        listingCount: listingCounts[i],
        referralCount: prof.referralCount || 0,
        referralPoints: prof.referralPoints || 0,
        referredBy: prof.referredBy || null,
        disabled: authUser.disabled,
        isAdmin: adminDocs[i] && adminDocs[i].exists,
      };
    });

    return {
      users,
      anonymousSkipped,
      nextPageToken: pageToken || null,
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

  // The profile email mirrors the login email (users keep it in sync), so it isn't editable here.
  const updates = {};
  if (data.displayName != null) updates.displayName = String(data.displayName).trim().slice(0, 80);
  if (data.fullName != null) updates.fullName = String(data.fullName).trim().slice(0, 120);
  if (data.phone != null) {
    updates.phone = String(data.phone).trim();
    if (updates.phone && !CONTACT_PHONE_RE.test(updates.phone)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid contact phone.");
    }
  }
  if (data.contactEmail != null) {
    updates.contactEmail = String(data.contactEmail).trim();
    if (updates.contactEmail && !CONTACT_EMAIL_RE.test(updates.contactEmail)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid contact email.");
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "No fields to update.");
  }

  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  updates.updatedByAdmin = context.auth.uid;

  try {
    const userRef = db.collection("users").doc(userId);
    const before = (await userRef.get()).data() || {};
    await userRef.set(updates, { merge: true });

    if (updates.displayName) {
      await admin.auth().updateUser(userId, { displayName: updates.displayName });
    }

    // Ads carry a copy of the contact details; keep them in line with the corrected account.
    const phoneChanged = "phone" in updates && updates.phone !== (before.phone || "");
    const emailChanged = "contactEmail" in updates && updates.contactEmail !== (before.contactEmail || "");
    let listingsUpdated = 0;
    if (phoneChanged || emailChanged) {
      listingsUpdated = await updateUserListings(userId, (listing) => {
        const patch = {};
        let prefs = Array.isArray(listing.contactPreferences) ? listing.contactPreferences : [];
        if (phoneChanged && listing.contactPhone) {
          patch.contactPhone = updates.phone;
          if (!updates.phone) prefs = prefs.filter((p) => p !== "phone" && p !== "whatsapp");
        }
        if (emailChanged && listing.contactEmail) {
          patch.contactEmail = updates.contactEmail;
          if (!updates.contactEmail) prefs = prefs.filter((p) => p !== "email");
        }
        if (Object.keys(patch).length) patch.contactPreferences = prefs;
        return patch;
      });
    }

    return { success: true, userId, updates, listingsUpdated };
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
    if (disabled) {
      // Ends refresh; already-issued ID tokens still work until they expire (≤ 1 hour)
      await admin.auth().revokeRefreshTokens(userId);
    }
    // Suspended ads drop out of public search (Algolia sync) and show as unavailable
    const listingsAffected = await updateUserListings(userId, (listing) => {
      if (disabled) {
        return listing.suspended === true ? null : {
          suspended: true,
          suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
      }
      return listing.suspended === true ? {
        suspended: admin.firestore.FieldValue.delete(),
        suspendedAt: admin.firestore.FieldValue.delete(),
      } : null;
    });
    await db.collection("users").doc(userId).set({
      disabled,
      disabledAt: disabled ? admin.firestore.FieldValue.serverTimestamp() : null,
      disabledByAdmin: disabled ? adminUid : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, userId, disabled, listingsAffected };
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

/**
 * Find listings by listing ID, owner email or owner UID; empty query = 100 newest.
 * data: { query?, status?: "active"|"pending"|"sold"|"suspended" }
 */
const adminSearchListings = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const query = String((data && data.query) || "").trim();
  const status = data && data.status ? String(data.status) : "";
  const listingsCol = db.collection("listings");

  try {
    let docs = [];
    let owner = null;
    if (!query) {
      docs = (await listingsCol.orderBy("createdAt", "desc").limit(100).get()).docs;
    } else {
      if (!query.includes("@") && /^[A-Za-z0-9_-]{10,128}$/.test(query)) {
        const byId = await listingsCol.doc(query).get();
        if (byId.exists) docs = [byId];
      }
      if (!docs.length) {
        let uid = null;
        if (query.includes("@")) {
          try {
            uid = (await admin.auth().getUserByEmail(query)).uid;
          } catch (e) {
            uid = null;
          }
        } else if (/^[A-Za-z0-9]{20,128}$/.test(query)) {
          uid = query;
        }
        if (uid) {
          owner = uid;
          docs = (await listingsCol.where("userId", "==", uid).limit(300).get()).docs;
        }
      }
    }

    let listings = docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title_es || d.title_en || "(no title)",
        category: d.category || null,
        subCategory: d.subCategory || null,
        status: d.status || "active",
        suspended: d.suspended === true,
        userId: d.userId || null,
        price: d.price || null,
        contactPhone: d.contactPhone || "",
        contactEmail: d.contactEmail || "",
        imageCount: Array.isArray(d.imageUrls) ? d.imageUrls.length : 0,
        createdAt: serializeTimestamp(d.createdAt),
        expiresAt: serializeTimestamp(d.expiresAt),
      };
    });
    if (status === "suspended") listings = listings.filter((l) => l.suspended);
    else if (status) listings = listings.filter((l) => l.status === status);
    listings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const emails = await emailsForUids(listings.map((l) => l.userId));
    listings.forEach((l) => { l.ownerEmail = emails[l.userId] || null; });
    return { listings, owner };
  } catch (error) {
    console.error("adminSearchListings error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/** Marks a user's email as verified (support cases where the link email never arrives). */
const adminSetEmailVerified = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const userId = data && data.userId;
  await assertCanModifyUser(adminUid, userId);
  try {
    await admin.auth().updateUser(userId, { emailVerified: true });
    return { success: true, userId };
  } catch (error) {
    console.error("adminSetEmailVerified error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
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
  adminSearchListings,
  adminSetEmailVerified,
};
