/**
 * Email verification helpers (Firebase Auth compat).
 *
 * Posting, paying and referral points need a verified email; the server checks it (firestore
 * and storage rules read the ID token's email_verified claim, Cloud Functions re-check the Auth
 * record). These helpers send the link and show a notice until the user has verified.
 */
(function (global) {
    'use strict';

    const TEXT = {
        en: {
            title: 'Verify your email',
            body: (email) => `We sent a verification link to ${email}. Open it, then come back here. You need a verified email to post ads.`,
            resend: 'Resend email',
            check: "I've verified",
            sent: 'Verification email sent. Check your inbox (and spam folder).',
            notYet: "We couldn't confirm it yet. Open the link in the email, then try again.",
            tooMany: 'Too many attempts. Please wait a few minutes and try again.',
            error: 'Could not send the email. Please try again later.',
        },
        es: {
            title: 'Verifique su correo',
            body: (email) => `Enviamos un enlace de verificación a ${email}. Ábralo y luego regrese aquí. Necesita un correo verificado para publicar anuncios.`,
            resend: 'Reenviar correo',
            check: 'Ya lo verifiqué',
            sent: 'Correo de verificación enviado. Revise su bandeja de entrada (y spam).',
            notYet: 'Aún no pudimos confirmarlo. Abra el enlace del correo y vuelva a intentar.',
            tooMany: 'Demasiados intentos. Espere unos minutos e intente de nuevo.',
            error: 'No se pudo enviar el correo. Intente más tarde.',
        },
    };

    /** Re-runs the site's language toggle so the new en/es spans show correctly. */
    function applyLang() {
        if (typeof global.setLang !== 'function') return;
        const lang = global.getPreferredLang ? global.getPreferredLang() : 'es';
        global.setLang(lang === 'en' ? 'en' : 'es');
    }

    /** Where the link in the email returns to. */
    function continueUrl() {
        return global.location.origin + '/my-account.html';
    }

    /**
     * Reloads the user and, once verified, refreshes the ID token so rules see email_verified.
     * Resolves to true when the email is verified.
     */
    async function refresh(user) {
        if (!user || user.isAnonymous) return false;
        await user.reload();
        if (user.emailVerified) {
            await user.getIdToken(true);
            return true;
        }
        return false;
    }

    function send(user) {
        return user.sendEmailVerification({ url: continueUrl() });
    }

    function bilingual(el, key, arg) {
        const en = typeof TEXT.en[key] === 'function' ? TEXT.en[key](arg) : TEXT.en[key];
        const es = typeof TEXT.es[key] === 'function' ? TEXT.es[key](arg) : TEXT.es[key];
        el.innerHTML = '';
        const spanEn = document.createElement('span');
        spanEn.className = 'lang-en';
        spanEn.textContent = en;
        const spanEs = document.createElement('span');
        spanEs.className = 'lang-es';
        spanEs.textContent = es;
        el.appendChild(spanEn);
        el.appendChild(spanEs);
    }

    /**
     * Renders the "verify your email" notice into `container` (emptied first).
     * opts.onVerified() runs once the user confirms and the token is refreshed.
     */
    function renderNotice(container, user, opts) {
        const options = opts || {};
        container.innerHTML = '';
        container.classList.remove('hidden');

        const box = document.createElement('div');
        box.className = 'mb-4 p-4 rounded-md border border-yellow-300 bg-yellow-50 text-sm text-yellow-900';
        box.setAttribute('role', 'status');

        const title = document.createElement('p');
        title.className = 'font-semibold mb-1';
        bilingual(title, 'title');
        const body = document.createElement('p');
        body.className = 'mb-3';
        bilingual(body, 'body', user.email || '');
        const status = document.createElement('p');
        status.className = 'mt-2 hidden';

        const actions = document.createElement('div');
        actions.className = 'flex flex-wrap gap-2';
        const checkBtn = document.createElement('button');
        checkBtn.type = 'button';
        checkBtn.className = 'px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700';
        bilingual(checkBtn, 'check');
        const resendBtn = document.createElement('button');
        resendBtn.type = 'button';
        resendBtn.className = 'px-3 py-1.5 rounded-md border border-yellow-400 bg-white hover:bg-yellow-100';
        bilingual(resendBtn, 'resend');
        actions.appendChild(checkBtn);
        actions.appendChild(resendBtn);

        function showStatus(key) {
            bilingual(status, key);
            status.classList.remove('hidden');
            applyLang();
        }

        checkBtn.addEventListener('click', async () => {
            checkBtn.disabled = true;
            try {
                if (await refresh(user)) {
                    container.innerHTML = '';
                    container.classList.add('hidden');
                    if (typeof options.onVerified === 'function') options.onVerified();
                } else {
                    showStatus('notYet');
                }
            } catch (err) {
                console.error('Verification check failed:', err);
                showStatus('error');
            } finally {
                checkBtn.disabled = false;
            }
        });

        resendBtn.addEventListener('click', async () => {
            resendBtn.disabled = true;
            try {
                await send(user);
                showStatus('sent');
            } catch (err) {
                console.error('Resend verification failed:', err);
                showStatus(err && err.code === 'auth/too-many-requests' ? 'tooMany' : 'error');
            } finally {
                setTimeout(() => { resendBtn.disabled = false; }, 30000);
            }
        });

        box.appendChild(title);
        box.appendChild(body);
        box.appendChild(actions);
        box.appendChild(status);
        container.appendChild(box);
        applyLang();
    }

    global.NunciaYaEmailVerification = { refresh, send, renderNotice };
})(typeof window !== 'undefined' ? window : global);
