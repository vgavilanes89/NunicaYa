/**
 * Refer-a-friend: capture ?ref= links, call Cloud Functions, UI helpers.
 */
(function (global) {
    const CODE_KEY = 'nunciaya-referral-code';
    const TS_KEY = 'nunciaya-referral-ts';
    const TTL_MS = 30 * 24 * 60 * 60 * 1000;

    function canUseLocalStorage() {
        try {
            if (typeof localStorage === 'undefined') return false;
            const probe = '__nunciaya_storage_probe__';
            localStorage.setItem(probe, '1');
            localStorage.removeItem(probe);
            return true;
        } catch (e) {
            return false;
        }
    }

    function captureFromUrl() {
        if (!canUseLocalStorage()) return;
        try {
            const ref = new URLSearchParams(window.location.search).get('ref');
            if (ref && ref.trim()) {
                localStorage.setItem(CODE_KEY, ref.trim());
                localStorage.setItem(TS_KEY, String(Date.now()));
            }
        } catch (e) {
            /* storage blocked in this context (private mode, iframe, extension) */
        }
    }

    function getStoredReferralCode() {
        if (!canUseLocalStorage()) return null;
        try {
            const code = localStorage.getItem(CODE_KEY);
            const ts = parseInt(localStorage.getItem(TS_KEY), 10);
            if (!code || !ts || Date.now() - ts > TTL_MS) {
                clearStoredReferral();
                return null;
            }
            return code;
        } catch (e) {
            return null;
        }
    }

    function clearStoredReferral() {
        if (!canUseLocalStorage()) return;
        try {
            localStorage.removeItem(CODE_KEY);
            localStorage.removeItem(TS_KEY);
        } catch (e) { /* ignore */ }
    }

    function getFunctions() {
        if (!global.firebase || !global.firebase.functions) return null;
        return global.firebase.functions();
    }

    function callFn(name, data) {
        const fn = getFunctions();
        if (!fn) return Promise.reject(new Error('Firebase Functions not available'));
        return fn.httpsCallable(name)(data || {}).then((r) => r.data);
    }

    function getMyReferralInfo() {
        return callFn('getMyReferralInfo');
    }

    function logReferralShare(method) {
        return callFn('logReferralShare', { method: method || 'copy' }).catch(() => null);
    }

    function completeReferralSignup(referralCode) {
        const code = referralCode || getStoredReferralCode();
        if (!code) return Promise.resolve({ attributed: false, reason: 'no_code' });
        return callFn('completeReferralSignup', { referralCode: code })
            .then((result) => {
                if (result && result.attributed) clearStoredReferral();
                return result;
            });
    }

    function buildSignupUrl(referralCode) {
        const base = (global.config && global.config.app && global.config.app.siteUrl)
            ? global.config.app.siteUrl.replace(/\/$/, '')
            : window.location.origin;
        return `${base}/my-account.html?ref=${encodeURIComponent(referralCode)}`;
    }

    function getShareMessage(link, lang) {
        const useEs = lang === 'es';
        if (useEs) {
            return `¡Únete a NunciaYa, el mercado local de Costa Rica! Crea tu cuenta con mi enlace:\n${link}`;
        }
        return `Join me on NunciaYa, Costa Rica's local marketplace! Sign up with my link:\n${link}`;
    }

    function canNativeShare() {
        return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    }

    async function copyReferralLink(link, lang) {
        const useEs = lang === 'es';
        try {
            await navigator.clipboard.writeText(link);
            return useEs ? '¡Enlace copiado!' : 'Link copied!';
        } catch (e) {
            return useEs ? 'No se pudo copiar. Seleccione el enlace manualmente.' : 'Could not copy. Select the link manually.';
        }
    }

    async function shareReferralNative(link, lang) {
        if (!canNativeShare()) {
            return { ok: false, reason: 'unsupported' };
        }
        const useEs = lang === 'es';
        await navigator.share({
            title: useEs ? 'Invitación a NunciaYa' : 'Join NunciaYa',
            text: getShareMessage(link, lang),
            url: link,
        });
        return { ok: true, method: 'native' };
    }

    function openShareUrl(url) {
        const win = global.open(url, '_blank', 'noopener,noreferrer');
        if (!win) {
            global.location.href = url;
        }
    }

    async function shareReferral(opts) {
        const link = opts && opts.link;
        const lang = (opts && opts.lang) || 'es';
        const method = (opts && opts.method) || 'native';
        if (!link) {
            throw new Error('Missing referral link');
        }

        if (method === 'native') {
            if (!canNativeShare()) {
                return shareReferral({ link, lang, method: 'whatsapp' });
            }
            return shareReferralNative(link, lang);
        }

        if (method === 'whatsapp') {
            const text = encodeURIComponent(getShareMessage(link, lang));
            openShareUrl(`https://wa.me/?text=${text}`);
            return { ok: true, method: 'whatsapp' };
        }

        if (method === 'email') {
            const subject = encodeURIComponent(lang === 'es' ? 'Únete a NunciaYa' : 'Join NunciaYa');
            const body = encodeURIComponent(getShareMessage(link, lang));
            global.location.href = `mailto:?subject=${subject}&body=${body}`;
            return { ok: true, method: 'email' };
        }

        if (method === 'sms') {
            const body = encodeURIComponent(getShareMessage(link, lang));
            global.location.href = `sms:?&body=${body}`;
            return { ok: true, method: 'sms' };
        }

        if (method === 'copy') {
            const message = await copyReferralLink(link, lang);
            return { ok: true, method: 'copy', message: message };
        }

        throw new Error('Unknown share method');
    }

    captureFromUrl();

    global.NunciaYaReferrals = {
        captureFromUrl,
        getStoredReferralCode,
        clearStoredReferral,
        getMyReferralInfo,
        logReferralShare,
        completeReferralSignup,
        buildSignupUrl,
        getShareMessage,
        canNativeShare,
        copyReferralLink,
        shareReferral,
        shareReferralNative,
    };
})(typeof window !== 'undefined' ? window : global);
