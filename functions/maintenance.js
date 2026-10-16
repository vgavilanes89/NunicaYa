/**
 * Scheduled housekeeping.
 *
 * Category pages sign every visitor in anonymously, so Firebase Auth fills up with throwaway
 * accounts. cleanupAnonymousUsers deletes anonymous accounts unused for 30 days. Anonymous
 * accounts can't post anymore, but any that own listings from before that change are skipped.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

const ANONYMOUS_MAX_IDLE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DELETES_PER_RUN = 20000;

function lastUsedMs(user) {
  const m = user.metadata;
  const when = m.lastRefreshTime || m.lastSignInTime || m.creationTime;
  return when ? Date.parse(when) : 0;
}

const cleanupAnonymousUsers = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("every 24 hours")
  .onRun(async () => {
    const cutoff = Date.now() - ANONYMOUS_MAX_IDLE_MS;
    const stale = [];
    let pageToken;
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      page.users.forEach((u) => {
        if (u.providerData.length === 0 && lastUsedMs(u) < cutoff) stale.push(u.uid);
      });
      pageToken = page.pageToken;
    } while (pageToken && stale.length < MAX_DELETES_PER_RUN);

    // Keep any anonymous account that still owns a listing
    const owners = new Set();
    for (let i = 0; i < stale.length; i += 30) {
      const snap = await db.collection("listings")
        .where("userId", "in", stale.slice(i, i + 30))
        .select("userId")
        .get();
      snap.forEach((doc) => owners.add(doc.get("userId")));
    }
    const toDelete = stale.filter((uid) => !owners.has(uid)).slice(0, MAX_DELETES_PER_RUN);

    let deleted = 0;
    let failed = 0;
    for (let i = 0; i < toDelete.length; i += 1000) {
      const result = await admin.auth().deleteUsers(toDelete.slice(i, i + 1000));
      deleted += result.successCount;
      failed += result.failureCount;
    }
    console.log(`cleanupAnonymousUsers: deleted ${deleted}, failed ${failed}, kept ${owners.size} owning listings.`);
    return null;
  });

module.exports = { cleanupAnonymousUsers };
