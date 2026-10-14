/**
 * Refer-a-friend modal with direct share (native, WhatsApp, email, SMS, copy).
 */
(function (global) {
    'use strict';

    let mounted = false;
    let eventsWired = false;
    let currentLang = 'es';

    function t(en, es) {
        return currentLang === 'es' ? es : en;
    }

    function getLang() {
        return global.getPreferredLang ? global.getPreferredLang() : 'es';
    }

    function supportsNativeShare() {
        if (global.NunciaYaReferrals && typeof global.NunciaYaReferrals.canNativeShare === 'function') {
            return global.NunciaYaReferrals.canNativeShare();
        }
        return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    }

    function getShareMessage(link, lang) {
        if (global.NunciaYaReferrals && typeof global.NunciaYaReferrals.getShareMessage === 'function') {
            return global.NunciaYaReferrals.getShareMessage(link, lang);
        }
        const useEs = lang === 'es';
        return useEs
            ? `¡Únete a NunciaYa, el mercado local de Costa Rica! Crea tu cuenta con mi enlace:\n${link}`
            : `Join me on NunciaYa, Costa Rica's local marketplace! Sign up with my link:\n${link}`;
    }

    async function runShare(link, lang, method) {
        if (global.NunciaYaReferrals && typeof global.NunciaYaReferrals.shareReferral === 'function') {
            return global.NunciaYaReferrals.shareReferral({ link, lang, method });
        }
        if (method === 'native') {
            if (!supportsNativeShare()) {
                return runShare(link, lang, 'whatsapp');
            }
            const useEs = lang === 'es';
            await navigator.share({
                title: useEs ? 'Invitación a NunciaYa' : 'Join NunciaYa',
                text: getShareMessage(link, lang),
                url: link,
            });
            return { ok: true, method: 'native' };
        }
        if (method === 'whatsapp') {
            const text = encodeURIComponent(getShareMessage(link, lang));
            global.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
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
            try {
                await navigator.clipboard.writeText(link);
                return { ok: true, method: 'copy', message: lang === 'es' ? '¡Enlace copiado!' : 'Link copied!' };
            } catch (e) {
                return { ok: true, method: 'copy', message: lang === 'es' ? 'Seleccione el enlace manualmente.' : 'Select the link manually.' };
            }
        }
        throw new Error('Unknown share method');
    }

    function modalEl() {
        return document.getElementById('referral-modal');
    }

    function setFeedback(message, isError) {
        const el = document.getElementById('referral-share-feedback');
        if (!el) return;
        if (!message) {
            el.classList.add('hidden');
            el.textContent = '';
            return;
        }
        el.textContent = message;
        el.classList.remove('hidden', 'text-green-600', 'text-red-600');
        el.classList.add(isError ? 'text-red-600' : 'text-green-600');
    }

    function updateDisplays(info) {
        const points = info.referralPoints || 0;
        const count = info.referralCount || 0;
        const link = info.referralLink || '';
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };
        set('referral-modal-points', points);
        set('referral-modal-count', count);
        set('referral-points-display', points);
        set('referral-count-display', count);
        set('referral-count-display-es', count);
        set('account-referral-points', points);
        set('account-referral-points-es', points);
        const input = document.getElementById('referral-link-input');
        if (input) input.value = link;
    }

    async function loadInfo() {
        if (!global.NunciaYaReferrals) return null;
        try {
            const info = await global.NunciaYaReferrals.getMyReferralInfo();
            updateDisplays(info);
            return info;
        } catch (err) {
            console.warn('Could not load referral info:', err);
            return null;
        }
    }

    function getLink() {
        const input = document.getElementById('referral-link-input');
        return input && input.value ? input.value.trim() : '';
    }

    async function afterShare(method, result) {
        if (global.NunciaYaReferrals) {
            global.NunciaYaReferrals.logReferralShare(method).catch(() => null);
        }
        if (result && result.message) {
            setFeedback(result.message, false);
        } else if (result && result.ok) {
            const labels = {
                native: t('Shared!', '¡Compartido!'),
                whatsapp: t('Opening WhatsApp…', 'Abriendo WhatsApp…'),
                email: t('Opening your email app…', 'Abriendo su correo…'),
                sms: t('Opening your messages app…', 'Abriendo mensajes…'),
            };
            setFeedback(labels[method] || t('Done!', '¡Listo!'), false);
        }
    }

    async function handleShare(method) {
        const link = getLink();
        if (!link || !global.NunciaYaReferrals) {
            setFeedback(t('Could not load your invite link.', 'No se pudo cargar su enlace.'), true);
            return;
        }
        currentLang = getLang();
        try {
            const result = await runShare(link, currentLang, method);
            await afterShare(method, result);
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            console.error('Share failed:', err);
            setFeedback(t('Could not share. Try another option.', 'No se pudo compartir. Pruebe otra opción.'), true);
        }
    }

    async function open() {
        const modal = modalEl();
        if (!modal) return;
        currentLang = getLang();
        setFeedback('');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        await loadInfo();
        const nativeBtn = document.getElementById('referral-share-native-btn');
        if (nativeBtn) {
            nativeBtn.classList.toggle('hidden', !supportsNativeShare());
        }
        if (global.setLang) global.setLang(currentLang);
    }

    function close() {
        const modal = modalEl();
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        setFeedback('');
    }

    function mount() {
        if (mounted || document.getElementById('referral-modal')) {
            mounted = true;
            wireEvents();
            return;
        }

        const wrap = document.createElement('div');
        wrap.innerHTML = `
<div id="referral-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200 flex justify-between items-start gap-4">
            <div>
                <h3 class="text-lg font-medium text-gray-900">
                    <span class="lang-en">Refer a Friend</span>
                    <span class="lang-es">Referir a un Amigo</span>
                </h3>
                <p class="mt-1 text-sm text-gray-500">
                    <span class="lang-en">Send your invite directly. You earn 1 point when a friend creates an account.</span>
                    <span class="lang-es">Envíe su invitación directamente. Gana 1 punto cuando un amigo cree una cuenta.</span>
                </p>
            </div>
            <button type="button" id="referral-modal-close" class="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="Close">&times;</button>
        </div>
        <div class="p-6 space-y-4">
            <div class="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-md">
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">
                        <span class="lang-en">Your points</span>
                        <span class="lang-es">Sus puntos</span>
                    </p>
                    <p class="text-xl font-bold text-blue-700" id="referral-modal-points">0</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-500 uppercase tracking-wide">
                        <span class="lang-en">Referrals</span>
                        <span class="lang-es">Referidos</span>
                    </p>
                    <p class="text-xl font-bold text-gray-800" id="referral-modal-count">0</p>
                </div>
            </div>
            <button type="button" id="referral-share-native-btn"
                class="w-full bg-green-600 text-white py-2.5 px-4 rounded-md hover:bg-green-700 font-medium">
                <span class="lang-en">Share invite</span>
                <span class="lang-es">Compartir invitación</span>
            </button>
            <div class="grid grid-cols-2 gap-2">
                <button type="button" data-referral-share="whatsapp"
                    class="flex items-center justify-center gap-2 py-2 px-3 border border-green-200 bg-green-50 text-green-800 rounded-md hover:bg-green-100 text-sm font-medium">
                    WhatsApp
                </button>
                <button type="button" data-referral-share="email"
                    class="flex items-center justify-center gap-2 py-2 px-3 border border-blue-200 bg-blue-50 text-blue-800 rounded-md hover:bg-blue-100 text-sm font-medium">
                    <span class="lang-en">Email</span>
                    <span class="lang-es">Correo</span>
                </button>
                <button type="button" data-referral-share="sms"
                    class="flex items-center justify-center gap-2 py-2 px-3 border border-gray-200 bg-gray-50 text-gray-800 rounded-md hover:bg-gray-100 text-sm font-medium">
                    <span class="lang-en">Text message</span>
                    <span class="lang-es">Mensaje de texto</span>
                </button>
                <button type="button" data-referral-share="copy"
                    class="flex items-center justify-center gap-2 py-2 px-3 border border-gray-200 bg-gray-50 text-gray-800 rounded-md hover:bg-gray-100 text-sm font-medium">
                    <span class="lang-en">Copy link</span>
                    <span class="lang-es">Copiar enlace</span>
                </button>
            </div>
            <div>
                <label for="referral-link-input" class="block text-xs text-gray-500 mb-1">
                    <span class="lang-en">Or copy your link manually</span>
                    <span class="lang-es">O copie su enlace manualmente</span>
                </label>
                <input type="text" id="referral-link-input" readonly
                    class="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-800">
            </div>
            <p id="referral-share-feedback" class="text-sm hidden"></p>
        </div>
    </div>
</div>`;
        document.body.appendChild(wrap.firstElementChild);
        mounted = true;
        wireEvents();
    }

    function wireEvents() {
        if (eventsWired) return;
        eventsWired = true;
        document.getElementById('referral-modal-close')?.addEventListener('click', close);
        modalEl()?.addEventListener('click', (e) => {
            if (e.target === modalEl()) close();
        });
        document.getElementById('referral-share-native-btn')?.addEventListener('click', () => {
            handleShare('native').catch(console.error);
        });
        document.querySelectorAll('[data-referral-share]').forEach((btn) => {
            btn.addEventListener('click', () => {
                handleShare(btn.getAttribute('data-referral-share')).catch(console.error);
            });
        });
    }

    const boundTriggers = new Set();

    function bindTrigger(selector) {
        document.querySelectorAll(selector).forEach((el) => {
            if (boundTriggers.has(el)) return;
            boundTriggers.add(el);
            el.addEventListener('click', (e) => {
                e.preventDefault();
                open().catch(console.error);
            });
        });
    }

    function init(options) {
        currentLang = getLang();
        mount();
        if (options && options.triggers) {
            options.triggers.forEach((sel) => bindTrigger(sel));
        }
        if (global.location.hash === '#refer') {
            open().then(() => {
                global.history.replaceState(null, '', global.location.pathname);
            }).catch(console.error);
        }
    }

    global.NunciaYaReferralUI = {
        mount,
        open,
        close,
        loadInfo,
        init,
    };
})(typeof window !== 'undefined' ? window : global);
