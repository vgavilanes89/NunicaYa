/**
 * Client helpers for NunciaYa Stripe Checkout (via Firebase Cloud Functions).
 *
 * Entitlements are enforced on the server: the createListing callable consumes an unused
 * payments/{id} record for housing ads and ads with more than 2 photos. The sessionStorage
 * values below only remember which payment id to offer first (a hint); they unlock nothing.
 */
(function (global) {
  "use strict";

  const SESSION_KEYS = {
    extra_images: "nunciaya_paid_extra_images",
    housing_listing: "nunciaya_paid_housing_listing",
  };

  function getFunctions() {
    if (typeof firebase === "undefined" || !firebase.functions) {
      throw new Error("Firebase Functions SDK is not loaded.");
    }
    return firebase.functions();
  }

  function isConfigured() {
    const payments = global.config && global.config.payments;
    return !!(payments && payments.enabled && payments.stripePublishableKey);
  }

  function requireFunctions() {
    return getFunctions();
  }

  async function startCheckout(productType, options) {
    if (!isConfigured()) {
      throw new Error("Payments are not configured on this site.");
    }
    const opts = options || {};
    const createCheckoutSession = getFunctions().httpsCallable("createCheckoutSession");
    const payload = {
      productType: productType,
      origin: global.location.origin,
    };
    if (opts.promoCode) {
      payload.promoCode = opts.promoCode;
    }
    if (opts.editId) {
      payload.editId = opts.editId;
    }
    const result = await createCheckoutSession(payload);
    if (!result.data || !result.data.url) {
      throw new Error("Could not start checkout.");
    }
    global.location.href = result.data.url;
  }

  async function validatePromoCode(code, productType, originalAmountCents) {
    const fn = requireFunctions().httpsCallable("validatePromoCode");
    const result = await fn({
      code: code,
      productType: productType,
      originalAmountCents: originalAmountCents,
    });
    return result.data;
  }

  async function redeemPromoCode(code, productType, originalAmountCents) {
    const fn = requireFunctions().httpsCallable("redeemPromoCode");
    const result = await fn({
      code: code,
      productType: productType,
      originalAmountCents: originalAmountCents,
    });
    return result.data;
  }

  async function verifyCheckoutSession(sessionId) {
    const verify = getFunctions().httpsCallable("verifyCheckoutSession");
    const result = await verify({ sessionId: sessionId });
    return result.data;
  }

  /** Remembers the payment id to spend first for a product (hint only). */
  function saveEntitlement(productType, paymentId) {
    const key = SESSION_KEYS[productType];
    if (key && paymentId) {
      sessionStorage.setItem(key, paymentId);
    }
  }

  function getPaymentHint(productType) {
    const key = SESSION_KEYS[productType];
    return (key && sessionStorage.getItem(key)) || null;
  }

  function clearEntitlement(productType) {
    const key = SESSION_KEYS[productType];
    if (key) sessionStorage.removeItem(key);
  }

  /**
   * Asks the server which products the user has paid for but not yet spent.
   * Resolves to { housing_listing: bool, extra_images: bool }.
   */
  async function getEntitlements() {
    const fn = getFunctions().httpsCallable("getMyEntitlements");
    const result = await fn({});
    return result.data || { housing_listing: false, extra_images: false };
  }

  /**
   * Creates a new listing on the server. The server sets userId, timestamps and status, and
   * consumes the payments a housing ad / extra photos require. Resolves to { id }.
   * Rejects with code "functions/failed-precondition" and details.productType when unpaid.
   */
  async function createListing(listing) {
    const fn = getFunctions().httpsCallable("createListing");
    const payments = {};
    Object.keys(SESSION_KEYS).forEach((productType) => {
      const hint = getPaymentHint(productType);
      if (hint) payments[productType] = hint;
    });
    const result = await fn({ listing: listing, payments: payments });
    Object.keys(SESSION_KEYS).forEach(clearEntitlement);
    return result.data;
  }

  /** Spends an extra-photos payment on an existing listing. Resolves to { unlocked }. */
  async function applyExtraImagesToListing(listingId) {
    const fn = getFunctions().httpsCallable("applyExtraImagesToListing");
    const result = await fn({
      listingId: listingId,
      paymentId: getPaymentHint("extra_images"),
    });
    clearEntitlement("extra_images");
    return result.data;
  }

  /** Returns the productType a createListing / apply error says is unpaid, or null. */
  function getMissingPaymentProduct(err) {
    if (!err) return null;
    if (err.details && err.details.productType) return err.details.productType;
    const match = String(err.message || "").match(/payment_required:(\w+)/);
    return match ? match[1] : null;
  }

  /** post-ad.html URL without payment params, keeping edit mode if present. */
  function cleanPostAdUrl(params) {
    const editId = params.get("edit_id");
    return editId ? `post-ad.html?edit_id=${encodeURIComponent(editId)}` : "post-ad.html";
  }

  /**
   * Call on post-ad page load after auth. Returns { productType } if payment succeeded.
   */
  async function handlePaymentReturn() {
    const params = new URLSearchParams(global.location.search);
    const payment = params.get("payment");
    const product = params.get("product");

    const cleanUrl = cleanPostAdUrl(params);

    if (payment === "cancelled") {
      global.history.replaceState({}, "", cleanUrl);
      return { cancelled: true, productType: product };
    }

    if (payment !== "success") return null;

    const sessionId = params.get("session_id");
    if (!sessionId) return null;

    try {
      const verified = await verifyCheckoutSession(sessionId);
      if (verified && verified.paid && verified.productType) {
        saveEntitlement(verified.productType, verified.sessionId || sessionId);
        global.history.replaceState({}, "", cleanUrl);
        return { paid: true, productType: verified.productType, sessionId: sessionId };
      }
    } catch (err) {
      console.error("Payment verification failed:", err);
      global.history.replaceState({}, "", cleanUrl);
      throw err;
    }

    global.history.replaceState({}, "", cleanUrl);
    return null;
  }

  global.NunciaYaPayments = {
    isConfigured: isConfigured,
    startCheckout: startCheckout,
    validatePromoCode: validatePromoCode,
    redeemPromoCode: redeemPromoCode,
    verifyCheckoutSession: verifyCheckoutSession,
    handlePaymentReturn: handlePaymentReturn,
    getEntitlements: getEntitlements,
    createListing: createListing,
    applyExtraImagesToListing: applyExtraImagesToListing,
    getMissingPaymentProduct: getMissingPaymentProduct,
    saveEntitlement: saveEntitlement,
    clearEntitlement: clearEntitlement,
    SESSION_KEYS: SESSION_KEYS,
  };
})(typeof window !== "undefined" ? window : global);
