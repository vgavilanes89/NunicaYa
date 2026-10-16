/**
 * Client-side copy of the Firebase Auth password policy (Authentication → Settings →
 * Password policy), so forms can say what's missing before Firebase rejects the password.
 * Firebase still enforces the real policy; keep these rules in sync if it changes.
 */
(function (global) {
    'use strict';

    const MIN_LENGTH = 8;
    const RULES = [
        { key: 'length', test: (p) => p.length >= MIN_LENGTH, en: `at least ${MIN_LENGTH} characters`, es: `al menos ${MIN_LENGTH} caracteres` },
        { key: 'upper', test: (p) => /[A-Z]/.test(p), en: 'an uppercase letter', es: 'una letra mayúscula' },
        { key: 'lower', test: (p) => /[a-z]/.test(p), en: 'a lowercase letter', es: 'una letra minúscula' },
        { key: 'number', test: (p) => /[0-9]/.test(p), en: 'a number', es: 'un número' },
        // Only the symbols Firebase's policy accepts (accented letters like ñ don't count)
        { key: 'symbol', test: (p) => /[\^$*.[\]{}()?"!@#%&/\\,><':;|_~`-]/.test(p), en: 'a symbol (e.g. ! @ # $ %)', es: 'un símbolo (ej. ! @ # $ %)' },
    ];

    /** Rules the password doesn't meet (empty array = OK). */
    function missing(password) {
        const p = String(password || '');
        return RULES.filter((r) => !r.test(p));
    }

    /** "Use at least 8 characters, an uppercase letter, …" for all rules or only the missing ones. */
    function describe(lang, rules) {
        const list = (rules || RULES).map((r) => (lang === 'en' ? r.en : r.es));
        return (lang === 'en' ? 'Use ' : 'Use ') + list.join(', ') + '.';
    }

    /** Error codes Firebase returns when a password breaks the policy. */
    function isPolicyError(code) {
        return code === 'auth/weak-password' || code === 'auth/password-does-not-meet-requirements';
    }

    global.NunciaYaPassword = { missing, describe, isPolicyError, MIN_LENGTH };
})(typeof window !== 'undefined' ? window : global);
