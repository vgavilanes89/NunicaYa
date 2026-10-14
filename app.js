// --- IMPORTS (Firebase SDKs are loaded globally via <script> tags in HTML) ---
const { initializeApp } = firebase; // Use global firebase object
const {
    getAuth,
    signInAnonymously,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} = firebase.auth;
const {
    getFirestore,
    doc,
    getDoc,
    addDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    orderBy,
    deleteDoc,
    updateDoc // Added updateDoc
} = firebase.firestore;

// --- Safely import Storage functions ---
let getStorage, storageRef, uploadBytesResumable, getDownloadURL, deleteObject;
if (firebase.storage) { // Check if storage SDK is loaded
    ({
        getStorage, // This might still be undefined in compat, use firebase.storage() directly
        ref: storageRef, // Alias ref to storageRef to avoid conflict
        uploadBytesResumable,
        getDownloadURL,
        deleteObject
    } = firebase.storage);
     console.log("Firebase Storage SDK functions imported.");
} else {
    console.error("Firebase Storage SDK not loaded or firebase.storage is undefined. Image uploads will fail.");
    // Assign null or dummy functions if needed, or rely on checks later
    getStorage = () => null; // Example dummy
    storageRef = () => null;
    uploadBytesResumable = () => null;
    getDownloadURL = () => null;
    deleteObject = () => null;
}


// Expose SDK functions needed by other pages globally
window.firebaseSDK = {
    initializeApp,
    getAuth,
    signInAnonymously,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    getFirestore,
    doc,
    getDoc,
    addDoc,
    setDoc,
    updateDoc, // Added updateDoc
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    orderBy,
    deleteDoc,
    // Add Storage functions safely
    getStorage: firebase.storage ? firebase.storage : () => { console.error("Storage not available"); return null; }, // Provide storage instance getter
    ref: storageRef,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
};


// --- 1. COMPONENT LOADING ---

async function loadComponents(pathPrefix = './') {
    const headerPath = `${pathPrefix}_header.html`;
    const footerPath = `${pathPrefix}_footer.html`;

    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (!headerPlaceholder) console.warn("Header placeholder not found.");
    if (!footerPlaceholder) console.warn("Footer placeholder not found.");

    try {
        const fetchPromises = [];
        if (headerPlaceholder) fetchPromises.push(fetch(headerPath));
        if (footerPlaceholder) fetchPromises.push(fetch(footerPath));

        if (fetchPromises.length === 0) return false;

        const responses = await Promise.all(fetchPromises);
        let headerLoaded = false;

        if (headerPlaceholder) {
            const headerRes = responses.shift();
            if (headerRes && headerRes.ok) {
                headerPlaceholder.innerHTML = await headerRes.text();
                headerLoaded = true;
            } else if (headerRes) {
                console.error(`Failed to load header from ${headerPath}. Status: ${headerRes.status}`);
                headerPlaceholder.innerHTML = '<p class="text-red-500 text-center">Error loading header</p>';
            }
        }

        if (footerPlaceholder) {
            const footerRes = responses.shift();
             if (footerRes && footerRes.ok) {
                footerPlaceholder.innerHTML = await footerRes.text();
            } else if (footerRes) {
                console.error(`Failed to load footer from ${footerPath}. Status: ${footerRes.status}`);
                footerPlaceholder.innerHTML = '<p class="text-red-500 text-center">Error loading footer</p>';
            }
        }
        return headerLoaded;

    } catch (error) {
        console.error('Error loading components:', error);
        if (headerPlaceholder) headerPlaceholder.innerHTML = '<p class="text-red-500 text-center">Error loading header</p>';
        if (footerPlaceholder) footerPlaceholder.innerHTML = '<p class="text-red-500 text-center">Error loading footer</p>';
        return false;
    }
}
window.loadComponents = loadComponents;


// --- 2. SESSION & LINK LOGIC ---
// Helper function to update link hrefs
// MODIFIED: Added footer link elements to the function arguments
function updateLinks(pathPrefix, homeL, postEnL, postEsL, accEnL, accEsL, 
                     helpL_f, safetyL_f, privacyL_f, termsL_f, aboutL_f) {
    const isLoggedIn = localStorage.getItem('nunciaya-user-session');
    
    // Header Links
    if (homeL) homeL.href = pathPrefix + 'index.html';

    if (isLoggedIn) {
        if (postEnL) postEnL.href = pathPrefix + 'post-ad.html';
        if (postEsL) postEsL.href = pathPrefix + 'post-ad.html';
        if (accEnL) accEnL.href = pathPrefix + 'profile.html';
        if (accEsL) accEsL.href = pathPrefix + 'profile.html';
    } else {
        if (postEnL) postEnL.href = pathPrefix + 'my-account.html';
        if (postEsL) postEsL.href = pathPrefix + 'my-account.html';
        if (accEnL) accEnL.href = pathPrefix + 'my-account.html';
        if (accEsL) accEsL.href = pathPrefix + 'my-account.html';
    }

    // NEW: Footer Links
    // All static pages are in the 'pages' folder, so we build a path to it
    const pagesPath = pathPrefix + 'pages/';
    if (helpL_f) helpL_f.href = pagesPath + 'contact-help.html';
    if (safetyL_f) safetyL_f.href = pagesPath + 'safety.html';
    if (privacyL_f) privacyL_f.href = pagesPath + 'privacy.html';
    if (termsL_f) termsL_f.href = pagesPath + 'terms.html';
    if (aboutL_f) aboutL_f.href = pagesPath + 'about.html';


    console.log("Session logic applied, links updated.");
}

function runSessionLogic(pathPrefix) {
    // Attempt to find links immediately
    const homeLink = document.getElementById('home-link');
    const postAdLinkEn = document.getElementById('post-ad-link-en');
    const postAdLinkEs = document.getElementById('post-ad-link-es');
    const myAccountLinkEn = document.getElementById('my-account-link-en');
    const myAccountLinkEs = document.getElementById('my-account-link-es');

    // NEW: Get footer links by ID
    const helpLink_f = document.getElementById('footer-help-link');
    const safetyLink_f = document.getElementById('footer-safety-link');
    const privacyLink_f = document.getElementById('footer-privacy-link');
    const termsLink_f = document.getElementById('footer-terms-link');
    const aboutLink_f = document.getElementById('footer-about-link');


    // If any link is missing, wait for DOM content to be potentially parsed, then try again
    // MODIFIED: Added footer links to the check
    if (!homeLink || !postAdLinkEn || !postAdLinkEs || !myAccountLinkEn || !myAccountLinkEs || 
        !helpLink_f || !safetyLink_f || !privacyLink_f || !termsLink_f || !aboutLink_f) {
        console.warn("Header or Footer links not found immediately in runSessionLogic. Waiting for DOMContentLoaded...");
        document.addEventListener('DOMContentLoaded', () => {
             // Re-query elements after DOM is loaded
            const homeLinkRetry = document.getElementById('home-link');
            const postAdLinkEnRetry = document.getElementById('post-ad-link-en');
            const postAdLinkEsRetry = document.getElementById('post-ad-link-es');
            const myAccountLinkEnRetry = document.getElementById('my-account-link-en');
            const myAccountLinkEsRetry = document.getElementById('my-account-link-es');
            
            // NEW: Footer retry
            const helpLinkRetry_f = document.getElementById('footer-help-link');
            const safetyLinkRetry_f = document.getElementById('footer-safety-link');
            const privacyLinkRetry_f = document.getElementById('footer-privacy-link');
            const termsLinkRetry_f = document.getElementById('footer-terms-link');
            const aboutLinkRetry_f = document.getElementById('footer-about-link');


            if (!homeLinkRetry || !postAdLinkEnRetry || !postAdLinkEsRetry || !myAccountLinkEnRetry || !myAccountLinkEsRetry) {
                 console.error("Header links still not found after DOMContentLoaded in runSessionLogic.");
                 // We don't return here, footer might still be found
            }
            
            // MODIFIED: Pass all links (header and footer) to updateLinks
            updateLinks(pathPrefix, 
                homeLinkRetry, postAdLinkEnRetry, postAdLinkEsRetry, myAccountLinkEnRetry, myAccountLinkEsRetry,
                helpLinkRetry_f, safetyLinkRetry_f, privacyLinkRetry_f, termsLinkRetry_f, aboutLinkRetry_f
            );
        });
        return; // Don't proceed further now, wait for DOMContentLoaded
    }
    // If links found immediately, update them
    // MODIFIED: Pass all links (header and footer) to updateLinks
     updateLinks(pathPrefix, 
        homeLink, postAdLinkEn, postAdLinkEs, myAccountLinkEn, myAccountLinkEs,
        helpLink_f, safetyLink_f, privacyLink_f, termsLink_f, aboutLink_f
     );
}
window.runSessionLogic = runSessionLogic;


// --- 3. LANGUAGE TOGGLE ---

const LANG_STORAGE_KEY = 'nunciaya-lang';
const DEFAULT_LANG = 'es';

function getPreferredLang() {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === 'en' ? 'en' : DEFAULT_LANG;
}

function setLang(lang, textMap = {}) {
    if (lang !== 'en' && lang !== 'es') {
        lang = getPreferredLang();
    } else {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
    }

    const enElements = document.querySelectorAll('.lang-en');
    const esElements = document.querySelectorAll('.lang-es');
    const btnEn = document.getElementById('lang-btn-en');
    const btnEs = document.getElementById('lang-btn-es');

    const updateButtonStyles = () => {
         if (!btnEn || !btnEs) return;
         if (lang === 'es') {
             btnEs.classList.add('font-bold', 'text-blue-700');
             btnEs.classList.remove('text-gray-600');
             btnEn.classList.remove('font-bold', 'text-blue-700');
             btnEn.classList.add('text-gray-600');
         } else {
             btnEn.classList.add('font-bold', 'text-blue-700');
             btnEn.classList.remove('text-gray-600');
             btnEs.classList.remove('font-bold', 'text-blue-700');
             btnEs.classList.add('text-gray-600');
         }
    };

    if (lang === 'es') {
        enElements.forEach(el => el.style.display = 'none');
        esElements.forEach(el => { el.style.display = el.classList.contains('block') ? 'block' : 'inline'; });
    } else {
        esElements.forEach(el => el.style.display = 'none');
        enElements.forEach(el => { el.style.display = el.classList.contains('block') ? 'block' : 'inline'; });
    }
    updateButtonStyles();

    for (const id in textMap) {
        const element = document.getElementById(id);
        if (element) {
            const textData = textMap[id];
            if (textData && textData[lang] !== undefined) {
                 if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') { element.placeholder = textData[lang]; }
                 else { element.textContent = textData[lang]; }
            } else {
                 if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') { element.placeholder = ''; }
                 else { element.textContent = ''; }
            }
        }
    }
}
window.setLang = setLang;
window.getPreferredLang = getPreferredLang;

/**
 * Resolves listing currency from stored field or price string (legacy ads).
 * @returns {'usd'|'crc'|null}
 */
function getListingCurrency(listing) {
    if (!listing) return null;
    if (listing.currency === 'usd' || listing.currency === 'crc') return listing.currency;
    const price = String(listing.price || '');
    if (price.includes('₡')) return 'crc';
    if (price.includes('$')) return 'usd';
    return null;
}

function getListingPriceAmount(listing) {
    if (!listing) return null;
    if (listing.priceAmount != null && listing.priceAmount !== '') {
        const n = Number(listing.priceAmount);
        return Number.isFinite(n) ? n : null;
    }
    const price = String(listing.price || '');
    if (!price) return null;
    const cleaned = price.replace(/[^0-9.]/g, '');
    const value = parseFloat(cleaned);
    return Number.isFinite(value) ? value : null;
}

/**
 * Formats price using only the currency selected when the ad was posted.
 */
function formatListingPrice(listing, lang) {
    const askLabel = lang === 'es' ? 'Consultar' : 'Ask';
    if (!listing) return askLabel;

    const amount = getListingPriceAmount(listing);
    const currency = getListingCurrency(listing);

    if (amount == null) {
        return listing.price || askLabel;
    }

    const locale = currency === 'crc' ? 'es-CR' : 'en-US';
    const formatted = amount.toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

    if (currency === 'crc') return `₡${formatted}`;
    if (currency === 'usd') return `$${formatted}`;
    return listing.price || askLabel;
}

window.getListingCurrency = getListingCurrency;
window.getListingPriceAmount = getListingPriceAmount;
window.formatListingPrice = formatListingPrice;

/** Escapes a value for safe use in HTML text and quoted attributes. */
function escapeHtmlText(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Returns a shallow copy of a listing with every top-level string (and string in an array)
 * HTML-escaped, so card templates built with innerHTML can't run user-supplied markup.
 * Non-string values (numbers, Timestamps, nested objects) are left untouched.
 */
function escapeListingForHtml(listing) {
    if (!listing || typeof listing !== 'object') return listing;
    const out = { ...listing };
    Object.keys(out).forEach((key) => {
        const v = out[key];
        if (typeof v === 'string') {
            out[key] = escapeHtmlText(v);
        } else if (Array.isArray(v)) {
            out[key] = v.map((item) => (typeof item === 'string' ? escapeHtmlText(item) : item));
        }
    });
    return out;
}

window.escapeHtmlText = escapeHtmlText;
window.escapeListingForHtml = escapeListingForHtml;

/** Algolia numeric filter — sold ads stay visible until publicVisibleUntilSeconds (48h after sold). */
function getPublicListingVisibilityFilter() {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return `publicVisibleUntilSeconds > ${nowSeconds}`;
}
window.getPublicListingVisibilityFilter = getPublicListingVisibilityFilter;


// --- 4. FIREBASE INITIALIZATION (Simplified Immediate Initialization) ---
// Define global variables BEFORE initialization attempt
window.firebaseAppInstance = null;
window.firebaseAuthInstance = null;
window.firestoreDbInstance = null;
window.firebaseStorageInstance = null;
let firebaseInitializationError = null; // Store potential error

/**
 * Ensure payments/promo helpers load even if a cached post-ad.html omits the script tag.
 */
(function loadPaymentsScriptSync() {
    if (typeof window === 'undefined' || window.NunciaYaPayments) return;
    if (typeof XMLHttpRequest === 'undefined') return;
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'js/payments.js?v=4', false);
        xhr.send(null);
        if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
            // eslint-disable-next-line no-new-func
            (new Function(xhr.responseText))();
        }
    } catch (err) {
        console.error('[NunciaYa] Could not load payments.js:', err);
    }
})();

function initializeFirebaseCore() {
    console.log("Attempting Firebase initialization (Core)...");
    // Check if the global 'firebase' object exists first
    if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
        firebaseInitializationError = "Firebase SDK base script not loaded correctly.";
        console.error(firebaseInitializationError);
        alert("Critical Error: Firebase not loaded. Please contact support.");
        return false; // Indicate failure
    }

    // Use centralized config from config.js, fallback to hardcoded for backward compatibility
    let firebaseConfig;
    if (typeof window !== 'undefined' && window.config && window.config.firebase) {
        firebaseConfig = window.config.firebase;
        console.log("Using Firebase config from config.js");
    } else {
        // Fallback to hardcoded config (for backward compatibility)
        console.warn("config.js not loaded, using fallback Firebase config. Please include config.js before app.js");
        firebaseConfig = {
            apiKey: "AIzaSyDebDNPmp0WC_LeFQr-KCbAILlugxD9tvc",
            authDomain: "nunciaya.com",
            projectId: "nunciaya-web",
            storageBucket: "nunciaya-web.firebasestorage.app",
            messagingSenderId: "1041609975205",
            appId: "1:1041609975205:web:8392b04db51684a6a4344c"
        };
    }

    // Check placeholder config
    if (!firebaseConfig || firebaseConfig.apiKey === "YOUR_API_KEY" || !firebaseConfig.apiKey) {
        firebaseInitializationError = "Firebase config is not set. Please check config.js or app.js.";
        console.error(firebaseInitializationError);
        alert("Firebase is not configured.");
        return false; // Indicate failure
    }

    try {
        // Initialize Firebase services using global compat objects
        // Use firebase.apps.length to check if already initialized (safer)
        let app;
        if (!firebase.apps.length) {
             app = firebase.initializeApp(firebaseConfig);
             console.log("Firebase app initialized.");
        } else {
             app = firebase.app(); // Get default app if already initialized
             console.log("Firebase app already initialized.");
        }

        const auth = firebase.auth(app); // Get auth instance for the app
        const db = firebase.firestore(app); // Get firestore instance for the app
        let storage = null;
        if (firebase.storage) { // Check again if storage is available
             storage = firebase.storage(app); // Get storage instance for the app
             console.log("Firebase Storage initialized.");
        } else {
             console.warn("Firebase Storage SDK not available during initialization.");
        }


        // Store instances globally *after* successful initialization/retrieval
        window.firebaseAppInstance = app;
        window.firebaseAuthInstance = auth;
        window.firestoreDbInstance = db;
        window.firebaseStorageInstance = storage; // Might be null if SDK failed to load

        console.log("Firebase services assigned globally.");
        return true; // Indicate success

    } catch (error) {
        firebaseInitializationError = `Error initializing Firebase: ${error.message}`;
        console.error(firebaseInitializationError, error);
        alert("Could not connect to services. Please try again later.");
        // Ensure globals are null on error
        window.firebaseAppInstance = null;
        window.firebaseAuthInstance = null;
        window.firestoreDbInstance = null;
        window.firebaseStorageInstance = null;
        return false; // Indicate failure
    }
}

// Immediately attempt initialization when app.js loads
const firebaseInitialized = initializeFirebaseCore();
if (!firebaseInitialized) {
    console.error("Firebase initialization failed on script load!");
    // Pages will check the instances and show errors if needed
}

// --- 5. SESSION INACTIVITY TIMEOUT ---
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes of inactivity
const ACTIVITY_THROTTLE_MS = 30 * 1000;   // Reset timer at most once per 30 seconds
const SESSION_LAST_ACTIVITY_KEY = 'nunciaya-session-last-activity';

let inactivityTimeoutId = null;
let lastActivityResetAt = 0;

function performSessionTimeout() {
    inactivityTimeoutId = null;
    const auth = window.firebaseAuthInstance;
    if (auth && auth.currentUser) {
        try {
            auth.signOut();
        } catch (e) {
            console.warn('SignOut during timeout:', e);
        }
    }
    localStorage.removeItem('nunciaya-user-session');
    localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
    try {
        sessionStorage.setItem('nunciaya-session-timeout', '1');
    } catch (err) { /* ignore */ }
    console.log('Session ended due to inactivity.');
    if (typeof window.__sessionTimeoutRedirect === 'function') {
        window.__sessionTimeoutRedirect();
    } else {
        window.location.reload();
    }
}

function checkSessionExpired() {
    const hasSession = localStorage.getItem('nunciaya-user-session');
    if (!hasSession) return;
    try {
        const lastStr = localStorage.getItem(SESSION_LAST_ACTIVITY_KEY);
        if (!lastStr) return;
        const last = parseInt(lastStr, 10);
        if (isNaN(last)) return;
        if (Date.now() - last >= SESSION_TIMEOUT_MS) {
            performSessionTimeout();
        }
    } catch (e) { /* ignore */ }
}

function syncUserPresenceToFirestore() {
    const auth = window.firebaseAuthInstance;
    const db = window.firestoreDbInstance;
    if (!auth || !db || !auth.currentUser || auth.currentUser.isAnonymous) return;
    if (typeof firebase === 'undefined' || !firebase.firestore || !firebase.firestore.FieldValue) return;
    db.collection('users').doc(auth.currentUser.uid).set({
        lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
        email: auth.currentUser.email || null,
    }, { merge: true }).catch(() => { /* non-blocking */ });
}

function recordActivity() {
    const now = Date.now();
    try {
        localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(now));
    } catch (e) { /* ignore */ }
    if (now - lastActivityResetAt < ACTIVITY_THROTTLE_MS) return;
    lastActivityResetAt = now;
    syncUserPresenceToFirestore();
    if (inactivityTimeoutId) clearTimeout(inactivityTimeoutId);
    inactivityTimeoutId = setTimeout(performSessionTimeout, SESSION_TIMEOUT_MS);
}

function setupSessionInactivityListeners() {
    const auth = window.firebaseAuthInstance;
    const hasSession = localStorage.getItem('nunciaya-user-session');
    if (!hasSession || !auth) return;

    // On load: if last activity was long ago, sign out now (handles new tab / navigation after idle)
    checkSessionExpired();

    // If still logged in, set initial last-activity and start timer
    recordActivity();

    const events = ['mousedown', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(ev => {
        document.addEventListener(ev, recordActivity, { passive: true });
    });

    // Check on visibility change (user returns to tab) – browsers throttle setTimeout in background
    document.addEventListener('visibilitychange', function onVisibilityChange() {
        if (document.visibilityState === 'visible') {
            checkSessionExpired();
        }
    });

    // Check on focus (e.g. user switches back to window)
    window.addEventListener('focus', checkSessionExpired);

    // Show message if user was just signed out due to inactivity
    try {
        if (sessionStorage.getItem('nunciaya-session-timeout')) {
            sessionStorage.removeItem('nunciaya-session-timeout');
            const banner = document.createElement('div');
            banner.setAttribute('role', 'alert');
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#2563eb;color:#fff;text-align:center;padding:10px;font-size:14px;';
            banner.textContent = 'You were signed out due to inactivity. Please sign in again.';
            document.body.prepend(banner);
            setTimeout(() => banner.remove(), 6000);
        }
    } catch (e) { /* ignore */ }
}


if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupSessionInactivityListeners);
    } else {
        setupSessionInactivityListeners();
    }
}

console.log("app.js loaded and executed.");