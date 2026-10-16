/**
 * Account checks for callable functions.
 *
 * Category pages sign visitors in anonymously, so `context.auth` alone doesn't mean a real
 * account. Posting, paying and redeeming codes need a full account with a verified email.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

function isAnonymous(context) {
  return !context.auth || context.auth.token.firebase?.sign_in_provider === "anonymous";
}

/** Throws unless the caller has a full (non-anonymous) account. Returns the uid. */
function requireAccount(context, message) {
  if (isAnonymous(context)) {
    throw new functions.https.HttpsError("unauthenticated", message || "Sign in with your account to continue.");
  }
  return context.auth.uid;
}

/**
 * Throws unless the caller has a full account with a verified email. The ID token's
 * email_verified claim can lag right after the user clicks the link, so a false claim is
 * re-checked against the Auth record. Returns the uid.
 */
async function requireVerifiedAccount(context, message) {
  const uid = requireAccount(context, message);
  if (context.auth.token.email_verified === true) return uid;
  const user = await admin.auth().getUser(uid);
  if (!user.emailVerified) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "email_not_verified",
      { reason: "email_not_verified" },
    );
  }
  return uid;
}

module.exports = { isAnonymous, requireAccount, requireVerifiedAccount };
