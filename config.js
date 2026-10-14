/**
 * Centralized configuration for NunciaYa
 * 
 * This file contains all API keys and configuration values.
 * For production, consider using environment variables or Firebase Remote Config.
 */

// Firebase Configuration
// Note: These are safe to expose client-side as they're public config
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDebDNPmp0WC_LeFQr-KCbAILlugxD9tvc",
    // Use custom domain so Auth + Cloud Functions work on nunciaya.com (not only *.web.app)
    authDomain: "nunciaya.com",
    projectId: "nunciaya-web",
    storageBucket: "nunciaya-web.firebasestorage.app",
    messagingSenderId: "1041609975205",
    appId: "1:1041609975205:web:8392b04db51684a6a4344c"
};

// Algolia Configuration
// These are search-only keys (safe for client-side)
const ALGOLIA_CONFIG = {
    appId: '14I0SKPECJ',
    searchKey: '3cbf4626a13232dedec995e2b05ba86a',
    indexName: 'listings'
};

// Application Configuration
const APP_CONFIG = {
    // Public site URL (custom domain)
    siteUrl: 'https://nunciaya.com',

    // Customer support inbox (shown in profile contact form)
    supportEmail: 'support@nunciaya.com',

    // Maximum number of images per listing (after paid upgrade)
    maxImagesPerListing: 5,
    
    // Free tier: images included without payment
    freeImageLimit: 2,
    
    // Maximum image file size in bytes (2MB)
    maxImageSize: 2 * 1024 * 1024,
    
    // Allowed image types
    allowedImageTypes: ['image/png', 'image/jpeg', 'image/gif'],
    
    // Default language
    defaultLanguage: 'es',
    
    // Search results per page
    searchResultsPerPage: 50,

    // Refer-a-friend: points earned per successful signup (must match Cloud Function)
    referralPointsPerSignup: 1
};

// Payments (Stripe Checkout via Cloud Functions)
// Publishable key is safe for client-side. Secret key (sk_...) lives only in functions/.env.nunciaya-web
const PAYMENTS_CONFIG = {
    enabled: true,
    currency: 'usd',
    stripePublishableKey: 'pk_test_51TdYPV1i29Gd2fPpFIvnphONcJGuNwAdeJlrMl8hUMnIG1zkoINGbM0xtFikR1QILM2wn086KlrrkSl20kVygJou001Zz6f4og',
    products: {
        extra_images: {
            priceUsd: 2,
            maxImages: 5,
            titleEn: 'Add More Photos',
            titleEs: 'Añadir Más Fotos',
            messageEn: 'Free listings include up to 2 photos. Pay $2 to unlock up to 5 photos for this ad.',
            messageEs: 'Los anuncios gratuitos incluyen hasta 2 fotos. Pague $2 para desbloquear hasta 5 fotos en este anuncio.',
            confirmEn: 'Pay $2 & Unlock',
            confirmEs: 'Pagar $2 y Desbloquear',
        },
        housing_listing: {
            priceUsd: 5,
            titleEn: 'Housing Listing Fee',
            titleEs: 'Tarifa por Anuncio de Vivienda',
            messageEn: 'Posting a housing ad (sale or rent) requires a $5 fee to help maintain the platform.',
            messageEs: 'Publicar un anuncio de vivienda (venta o alquiler) requiere una tarifa de $5 para mantener la plataforma.',
            confirmEn: 'Pay $5 & Continue',
            confirmEs: 'Pagar $5 y Continuar',
        },
    },
};

// Export configuration
// Use window.config for global access (compatible with current codebase)
if (typeof window !== 'undefined') {
    window.config = {
        firebase: FIREBASE_CONFIG,
        algolia: ALGOLIA_CONFIG,
        app: APP_CONFIG,
        payments: PAYMENTS_CONFIG,
    };
}

// For Node.js environments (e.g., if you add server-side code later)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        firebase: FIREBASE_CONFIG,
        algolia: ALGOLIA_CONFIG,
        app: APP_CONFIG,
        payments: PAYMENTS_CONFIG,
    };
}

