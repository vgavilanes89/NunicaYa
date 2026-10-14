/**
 * Refer-a-friend: attribute signups, track points, expose stats to users and admins.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

/** Points granted to referrer per successful signup. */
const POINTS_PER_REFERRAL = 1;

/** Only attribute referrals within this window after account creation (ms). */
const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function siteBaseUrl() {
  return process.env.SITE_URL || "https://nunciaya.com";
}

async function ensureUserReferralFields(uid) {
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const patch = {};
  if (!data.referralCode) patch.referralCode = uid;
  if (data.referralPoints == null) patch.referralPoints = 0;
  if (data.referralCount == null) patch.referralCount = 0;
  if (Object.keys(patch).length > 0) {
    patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await ref.set(patch, { merge: true });
  }
  return { referralCode: data.referralCode || uid, referralPoints: data.referralPoints || 0, referralCount: data.referralCount || 0 };
}

/**
 * Returns referral link, points, and count for the signed-in user.
 */
const getMyReferralInfo = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in with a full account.");
  }
  const uid = context.auth.uid;
  try {
    const stats = await ensureUserReferralFields(uid);
    const base = siteBaseUrl().replace(/\/$/, "");
    return {
      referralCode: stats.referralCode,
      referralLink: `${base}/my-account.html?ref=${encodeURIComponent(stats.referralCode)}`,
      referralPoints: stats.referralPoints,
      referralCount: stats.referralCount,
      pointsPerReferral: POINTS_PER_REFERRAL,
    };
  } catch (error) {
    console.error("getMyReferralInfo error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Log when a user copies or shares their referral link (optional analytics).
 */
const logReferralShare = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
  }
  const uid = context.auth.uid;
  const method = (data && data.method) ? String(data.method).slice(0, 32) : "copy";
  try {
    await db.collection("referral-shares").add({
      referrerUid: uid,
      method,
      sharedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("logReferralShare error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Attribute a new account to a referrer (call once after signup).
 */
const completeReferralSignup = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in with a full account.");
  }

  const referredUid = context.auth.uid;
  const referralCode = data && data.referralCode ? String(data.referralCode).trim() : "";
  if (!referralCode) {
    return { attributed: false, reason: "no_code" };
  }

  if (referralCode === referredUid) {
    return { attributed: false, reason: "self_referral" };
  }

  try {
    const authUser = await admin.auth().getUser(referredUid);
    const createdMs = new Date(authUser.metadata.creationTime).getTime();
    if (Date.now() - createdMs > ATTRIBUTION_WINDOW_MS) {
      return { attributed: false, reason: "window_expired" };
    }

    const referrerRef = db.collection("users").doc(referralCode);
    const referredRef = db.collection("users").doc(referredUid);
    const referralDocRef = db.collection("referrals").doc(referredUid);

    const result = await db.runTransaction(async (tx) => {
      const [referrerSnap, referredSnap, referralSnap] = await Promise.all([
        tx.get(referrerRef),
        tx.get(referredRef),
        tx.get(referralDocRef),
      ]);

      if (!referrerSnap.exists) {
        return { attributed: false, reason: "invalid_referrer" };
      }
      if (referralSnap.exists) {
        return { attributed: false, reason: "already_attributed" };
      }

      const referredData = referredSnap.exists ? referredSnap.data() : {};
      if (referredData.referredBy) {
        return { attributed: false, reason: "already_attributed" };
      }

      const referrerData = referrerSnap.data();
      const newCount = (referrerData.referralCount || 0) + 1;
      const newPoints = (referrerData.referralPoints || 0) + POINTS_PER_REFERRAL;

      tx.set(referralDocRef, {
        referrerUid: referralCode,
        referredUid,
        referredEmail: authUser.email || null,
        pointsAwarded: POINTS_PER_REFERRAL,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.set(referredRef, {
        referredBy: referralCode,
        referralCode: referredUid,
        referralPoints: referredData.referralPoints != null ? referredData.referralPoints : 0,
        referralCount: referredData.referralCount != null ? referredData.referralCount : 0,
      }, { merge: true });

      tx.set(referrerRef, {
        referralCount: newCount,
        referralPoints: newPoints,
        referralCode: referrerData.referralCode || referralCode,
      }, { merge: true });

      return {
        attributed: true,
        referrerUid: referralCode,
        referralPoints: newPoints,
        referralCount: newCount,
      };
    });

    return result;
  } catch (error) {
    console.error("completeReferralSignup error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

module.exports = {
  getMyReferralInfo,
  logReferralShare,
  completeReferralSignup,
  POINTS_PER_REFERRAL,
};
