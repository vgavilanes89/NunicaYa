/**
 * NunciaYa Admin Dashboard client logic.
 */
(function () {
    const CATEGORY_LABELS = {
        housing: { en: 'Housing', es: 'Vivienda' },
        forSale: { en: 'For Sale', es: 'En Venta' },
        jobs: { en: 'Jobs', es: 'Empleo' },
        services: { en: 'Services', es: 'Servicios' },
        community: { en: 'Community', es: 'Comunidad' },
        personals: { en: 'Personals', es: 'Personales' },
    };

    const PRODUCT_LABELS = {
        extra_images: 'Extra photos ($2)',
        housing_listing: 'Housing listing ($5)',
    };

    const PROMO_PRODUCT_LABELS = {
        extra_images: { en: 'Extra photos', es: 'Fotos extra' },
        housing_listing: { en: 'Housing fee', es: 'Tarifa vivienda' },
    };

    let currentUserPromoRedemptions = [];

    let currentLang = 'es';
    let functionsApi = null;
    let dashboardData = null;
    let usersCache = [];
    let currentAdminUid = null;
    let pendingDeleteUserIds = [];
    let selectedUserIds = new Set();

    function t(en, es) {
        return currentLang === 'es' ? es : en;
    }

    function fmtDate(ms) {
        if (!ms) return '—';
        return new Date(ms).toLocaleString(currentLang === 'es' ? 'es-CR' : 'en-US');
    }

    function fmtMoney(cents, currency) {
        if (cents == null) return '—';
        const cur = (currency || 'usd').toUpperCase();
        return cur === 'USD' ? `$${(cents / 100).toFixed(2)}` : `${(cents / 100).toFixed(2)} ${cur}`;
    }

    function show(el, visible) {
        if (!el) return;
        if (visible) {
            el.classList.remove('hidden');
            if (el.classList.contains('fixed')) el.classList.add('flex');
        } else {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function callFn(name, data) {
        if (!functionsApi) return Promise.reject(new Error('Functions not ready'));
        return functionsApi.httpsCallable(name)(data || {}).then((r) => r.data);
    }

    function switchTab(tabId) {
        document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
            btn.classList.toggle('border-blue-600', btn.dataset.adminTab === tabId);
            btn.classList.toggle('text-blue-700', btn.dataset.adminTab === tabId);
            btn.classList.toggle('border-transparent', btn.dataset.adminTab !== tabId);
            btn.classList.toggle('text-gray-600', btn.dataset.adminTab !== tabId);
        });
        document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
            panel.classList.toggle('hidden', panel.dataset.adminPanel !== tabId);
        });
    }

    function renderOverview(d) {
        setText('stat-total-listings', d.totalListings);
        setText('stat-total-users', d.totalUsers);
        setText('stat-new-7', d.newLast7Days);
        setText('stat-new-30', d.newLast30Days);
        setText('stat-new-users-30', d.newUsersLast30Days);
        setText('stat-online-users', d.onlineUserCount);
        setText('stat-status-active', d.byStatus.active);
        setText('stat-status-pending', d.byStatus.pending);
        setText('stat-status-sold', d.byStatus.sold);
        setText('stat-revenue', `$${d.payments.totalRevenueUsd}`);
        setText('stat-paid-count', d.payments.paidCount);
        setText('stat-open-help', d.helpRequests.openCount);
        setText('stat-last-updated', fmtDate(d.generatedAt));

        const catList = document.getElementById('stat-by-category');
        if (catList && d.byCategory) {
            catList.innerHTML = '';
            Object.keys(d.byCategory).forEach((cat) => {
                const li = document.createElement('li');
                li.className = 'flex justify-between border-b border-gray-100 py-2';
                const label = CATEGORY_LABELS[cat] ? CATEGORY_LABELS[cat][currentLang] : cat;
                li.innerHTML = `<span>${label}</span><span class="font-semibold">${d.byCategory[cat]}</span>`;
                catList.appendChild(li);
            });
        }

        const payProducts = document.getElementById('stat-payments-by-product');
        if (payProducts && d.payments.byProduct) {
            payProducts.innerHTML = '';
            Object.keys(d.payments.byProduct).forEach((key) => {
                if (d.payments.byProduct[key] === 0) return;
                const li = document.createElement('li');
                li.className = 'flex justify-between py-1 text-sm';
                li.innerHTML = `<span>${PRODUCT_LABELS[key] || key}</span><span class="font-medium">${d.payments.byProduct[key]}</span>`;
                payProducts.appendChild(li);
            });
        }

        renderListingsTable('stat-recent-list', d.recentListings, true);
        renderPaymentsTable('overview-payments-list', d.payments.recent.slice(0, 8));
        renderOnlineTable('overview-online-list', d.onlineUsers.slice(0, 8));
    }

    function renderListingsTable(containerId, listings, compact) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!listings || listings.length === 0) {
            el.innerHTML = `<p class="text-gray-500 text-sm">${t('No listings.', 'No hay anuncios.')}</p>`;
            return;
        }
        const rows = listings.map((l) => {
            const statusCell = compact
                ? (l.status || '—')
                : `<select class="listing-status-select border rounded px-1 py-0.5 text-sm" data-id="${l.id}">
                    <option value="active" ${l.status === 'active' ? 'selected' : ''}>active</option>
                    <option value="pending" ${l.status === 'pending' ? 'selected' : ''}>pending</option>
                    <option value="sold" ${l.status === 'sold' ? 'selected' : ''}>sold</option>
                   </select>`;
            const actionsCell = compact
                ? ''
                : `<td class="py-2 whitespace-nowrap">
                    <button type="button" class="delete-listing-btn text-red-600 hover:underline text-sm"
                        data-id="${escapeHtml(l.id)}" data-title="${escapeHtml(l.title || l.id)}">${t('Delete', 'Borrar')}</button>
                   </td>`;
            return `<tr class="border-b border-gray-100 hover:bg-gray-50" data-listing-id="${escapeHtml(l.id)}">
                <td class="py-2 pr-2"><a href="pages/listing/detail.html?id=${l.id}" class="text-blue-600 hover:underline" target="_blank">${escapeHtml(l.title || l.id)}</a></td>
                <td class="py-2 pr-2 text-sm">${escapeHtml(l.category || '—')}</td>
                <td class="py-2 pr-2 text-sm">${escapeHtml(l.price || '—')}</td>
                <td class="py-2 pr-2 text-sm">${statusCell}</td>
                <td class="py-2 text-sm text-gray-500">${fmtDate(l.createdAt)}</td>
                ${actionsCell}
            </tr>`;
        }).join('');
        const actionsHeader = compact ? '' : `<th class="py-2">${t('Actions', 'Acciones')}</th>`;
        el.innerHTML = `<table class="min-w-full text-sm"><thead><tr class="border-b text-left text-gray-500">
            <th class="py-2 pr-2">${t('Title', 'Título')}</th>
            <th class="py-2 pr-2">${t('Category', 'Categoría')}</th>
            <th class="py-2 pr-2">${t('Price', 'Precio')}</th>
            <th class="py-2 pr-2">${t('Status', 'Estado')}</th>
            <th class="py-2">${t('Created', 'Creado')}</th>
            ${actionsHeader}
        </tr></thead><tbody>${rows}</tbody></table>`;

        if (!compact) {
            el.querySelectorAll('.listing-status-select').forEach((sel) => {
                sel.addEventListener('change', () => updateListingStatus(sel.dataset.id, sel.value));
            });
            el.querySelectorAll('.delete-listing-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    deleteListing(btn.dataset.id, btn.dataset.title).catch(console.error);
                });
            });
        }
    }

    function renderPaymentsTable(containerId, payments) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!payments || payments.length === 0) {
            el.innerHTML = `<p class="text-gray-500 text-sm">${t('No payments yet.', 'Aún no hay pagos.')}</p>`;
            return;
        }
        const rows = payments.map((p) => `<tr class="border-b border-gray-100">
            <td class="py-2 pr-2 text-xs font-mono">${escapeHtml((p.id || '').slice(0, 14))}…</td>
            <td class="py-2 pr-2 text-sm">${PRODUCT_LABELS[p.productType] || p.productType || '—'}</td>
            <td class="py-2 pr-2 text-sm">${fmtMoney(p.amountCents, p.currency)}</td>
            <td class="py-2 pr-2 text-sm"><span class="${p.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}">${p.status}</span></td>
            <td class="py-2 text-sm text-gray-500">${fmtDate(p.paidAt || p.createdAt)}</td>
        </tr>`).join('');
        el.innerHTML = `<table class="min-w-full text-sm"><thead><tr class="border-b text-left text-gray-500">
            <th class="py-2 pr-2">ID</th><th class="py-2 pr-2">${t('Product', 'Producto')}</th>
            <th class="py-2 pr-2">${t('Amount', 'Monto')}</th><th class="py-2 pr-2">${t('Status', 'Estado')}</th>
            <th class="py-2">${t('Date', 'Fecha')}</th>
        </tr></thead><tbody>${rows}</tbody></table>`;
    }

    function renderOnlineTable(containerId, users) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!users || users.length === 0) {
            el.innerHTML = `<p class="text-gray-500 text-sm">${t('No users active in the last 15 minutes.', 'Ningún usuario activo en los últimos 15 minutos.')}</p>`;
            return;
        }
        const rows = users.map((u) => `<tr class="border-b border-gray-100">
            <td class="py-2 pr-2 text-sm">${escapeHtml(u.displayName || u.fullName || '—')}</td>
            <td class="py-2 pr-2 text-sm">${escapeHtml(u.email || '—')}</td>
            <td class="py-2 text-sm text-gray-500">${fmtDate(u.lastActiveAt)}</td>
        </tr>`).join('');
        el.innerHTML = `<table class="min-w-full text-sm"><thead><tr class="border-b text-left text-gray-500">
            <th class="py-2 pr-2">${t('Name', 'Nombre')}</th>
            <th class="py-2 pr-2">Email</th>
            <th class="py-2">${t('Last active', 'Última actividad')}</th>
        </tr></thead><tbody>${rows}</tbody></table>`;
    }

    function isUserDeletable(user) {
        return user && !user.isAdmin && user.uid !== currentAdminUid;
    }

    function updateDeleteSelectedButton() {
        const btn = document.getElementById('delete-selected-users');
        if (!btn) return;
        const count = selectedUserIds.size;
        btn.disabled = count === 0;
        btn.textContent = t(`Delete selected (${count})`, `Borrar seleccionados (${count})`);
    }

    function renderUsersTable(users) {
        usersCache = users || [];
        const el = document.getElementById('users-table');
        if (!el) return;
        const filter = (document.getElementById('users-search') || {}).value || '';
        const q = filter.toLowerCase();
        const filtered = usersCache.filter((u) => {
            if (!q) return true;
            return [u.email, u.displayName, u.fullName, u.phone, u.uid].some((v) =>
                String(v || '').toLowerCase().includes(q));
        });

        if (filtered.length === 0) {
            el.innerHTML = `<p class="text-gray-500">${t('No users found.', 'No se encontraron usuarios.')}</p>`;
            updateDeleteSelectedButton();
            return;
        }

        const deletableFiltered = filtered.filter(isUserDeletable);
        const allDeletableSelected = deletableFiltered.length > 0
            && deletableFiltered.every((u) => selectedUserIds.has(u.uid));
        const someDeletableSelected = deletableFiltered.some((u) => selectedUserIds.has(u.uid));

        const rows = filtered.map((u) => {
            const protectedUser = !isUserDeletable(u);
            let statusLabel = t('Active', 'Activo');
            let statusClass = 'text-green-600';
            if (u.isAdmin) {
                statusLabel = 'Admin';
                statusClass = 'text-blue-600';
            } else if (u.disabled) {
                statusLabel = t('Disabled', 'Desactivado');
                statusClass = 'text-red-600';
            }
            const toggleLabel = u.disabled
                ? t('Activate', 'Activar')
                : t('Deactivate', 'Desactivar');
            const actionBtns = protectedUser
                ? `<span class="text-xs text-gray-400">${t('Protected', 'Protegido')}</span>`
                : `<button type="button" class="text-blue-600 hover:underline text-sm edit-user-btn" data-uid="${u.uid}">${t('Edit', 'Editar')}</button>
                   <button type="button" class="text-amber-600 hover:underline text-sm ml-2 toggle-user-btn" data-uid="${u.uid}" data-disabled="${u.disabled ? '1' : '0'}">${toggleLabel}</button>
                   <button type="button" class="text-red-600 hover:underline text-sm ml-2 delete-user-btn" data-uid="${u.uid}">${t('Delete', 'Borrar')}</button>`;
            const checkboxCell = protectedUser
                ? `<td class="py-2 pr-2 w-8"></td>`
                : `<td class="py-2 pr-2 w-8">
                    <input type="checkbox" class="user-select-checkbox rounded border-gray-300" data-uid="${u.uid}"
                        ${selectedUserIds.has(u.uid) ? 'checked' : ''} aria-label="${t('Select user', 'Seleccionar usuario')}">
                </td>`;
            return `<tr class="border-b border-gray-100 hover:bg-gray-50 ${u.disabled ? 'bg-red-50/40' : ''} ${selectedUserIds.has(u.uid) ? 'bg-blue-50/40' : ''}">
            ${checkboxCell}
            <td class="py-2 pr-2 text-xs font-mono">${escapeHtml(u.uid.slice(0, 10))}…</td>
            <td class="py-2 pr-2 text-sm">${escapeHtml(u.email || '—')}</td>
            <td class="py-2 pr-2 text-sm">${escapeHtml(u.displayName || '—')}</td>
            <td class="py-2 pr-2 text-sm"><span class="font-medium ${statusClass}">${statusLabel}</span></td>
            <td class="py-2 pr-2 text-sm text-center">${u.listingCount}</td>
            <td class="py-2 pr-2 text-sm text-center font-medium text-blue-700">${u.referralPoints != null ? u.referralPoints : 0}</td>
            <td class="py-2 pr-2 text-sm text-gray-500">${fmtDate(u.lastActiveAt)}</td>
            <td class="py-2 whitespace-nowrap">${actionBtns}</td>
        </tr>`;
        }).join('');

        el.innerHTML = `<table class="min-w-full text-sm"><thead><tr class="border-b text-left text-gray-500">
            <th class="py-2 pr-2 w-8">
                <input type="checkbox" id="select-all-users" class="rounded border-gray-300"
                    ${allDeletableSelected ? 'checked' : ''}
                    ${someDeletableSelected && !allDeletableSelected ? 'data-indeterminate="1"' : ''}
                    aria-label="${t('Select all visible users', 'Seleccionar todos los visibles')}">
            </th>
            <th class="py-2 pr-2">UID</th><th class="py-2 pr-2">Email</th>
            <th class="py-2 pr-2">${t('Display name', 'Nombre visible')}</th>
            <th class="py-2 pr-2">${t('Status', 'Estado')}</th>
            <th class="py-2 pr-2">${t('Ads', 'Anuncios')}</th>
            <th class="py-2 pr-2">${t('Referral pts', 'Pts referidos')}</th>
            <th class="py-2 pr-2">${t('Last active', 'Activo')}</th>
            <th class="py-2">${t('Actions', 'Acciones')}</th>
        </tr></thead><tbody>${rows}</tbody></table>`;

        const selectAll = el.querySelector('#select-all-users');
        if (selectAll) {
            selectAll.indeterminate = someDeletableSelected && !allDeletableSelected;
            selectAll.addEventListener('change', () => {
                if (selectAll.checked) {
                    deletableFiltered.forEach((u) => selectedUserIds.add(u.uid));
                } else {
                    deletableFiltered.forEach((u) => selectedUserIds.delete(u.uid));
                }
                renderUsersTable(usersCache);
            });
        }

        el.querySelectorAll('.user-select-checkbox').forEach((cb) => {
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    selectedUserIds.add(cb.dataset.uid);
                } else {
                    selectedUserIds.delete(cb.dataset.uid);
                }
                updateDeleteSelectedButton();
                renderUsersTable(usersCache);
            });
        });

        el.querySelectorAll('.edit-user-btn').forEach((btn) => {
            btn.addEventListener('click', () => openUserModal(btn.dataset.uid));
        });
        el.querySelectorAll('.toggle-user-btn').forEach((btn) => {
            btn.addEventListener('click', () => toggleUserDisabled(btn.dataset.uid, btn.dataset.disabled === '1'));
        });
        el.querySelectorAll('.delete-user-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                openDeleteUserModal([btn.dataset.uid]);
            });
        });

        updateDeleteSelectedButton();
    }

    function renderHelpTable(requests) {
        const el = document.getElementById('help-table');
        if (!el) return;
        if (!requests || requests.length === 0) {
            el.innerHTML = `<p class="text-gray-500">${t('No support requests.', 'No hay solicitudes de soporte.')}</p>`;
            return;
        }
        const rows = requests.map((r) => `<tr class="border-b border-gray-100 align-top">
            <td class="py-2 pr-2 text-sm">${escapeHtml(r.name || '—')}<br><span class="text-gray-500 text-xs">${escapeHtml(r.email || '')}</span></td>
            <td class="py-2 pr-2 text-sm">${escapeHtml(r.topicLabel || r.topic || '—')}</td>
            <td class="py-2 pr-2 text-sm max-w-xs">${escapeHtml((r.message || '').slice(0, 120))}${(r.message || '').length > 120 ? '…' : ''}</td>
            <td class="py-2 pr-2 text-sm">
                <select class="help-status-select border rounded px-1 py-0.5" data-id="${r.id}">
                    <option value="new" ${r.status === 'new' ? 'selected' : ''}>new</option>
                    <option value="in_review" ${r.status === 'in_review' ? 'selected' : ''}>in_review</option>
                    <option value="resolved" ${r.status === 'resolved' ? 'selected' : ''}>resolved</option>
                </select>
            </td>
            <td class="py-2 text-sm text-gray-500">${fmtDate(r.submittedAt)}</td>
        </tr>`).join('');
        el.innerHTML = `<table class="min-w-full text-sm"><thead><tr class="border-b text-left text-gray-500">
            <th class="py-2 pr-2">${t('User', 'Usuario')}</th>
            <th class="py-2 pr-2">${t('Subject', 'Asunto')}</th>
            <th class="py-2 pr-2">${t('Message', 'Mensaje')}</th>
            <th class="py-2 pr-2">${t('Status', 'Estado')}</th>
            <th class="py-2">${t('Submitted', 'Enviado')}</th>
        </tr></thead><tbody>${rows}</tbody></table>`;

        el.querySelectorAll('.help-status-select').forEach((sel) => {
            sel.addEventListener('change', () => updateHelpStatus(sel.dataset.id, sel.value));
        });
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function promoProductLabel(productType) {
        const labels = PROMO_PRODUCT_LABELS[productType];
        return labels ? labels[currentLang] || labels.en : productType;
    }

    function renderUserPromoRedemptions(redemptions) {
        const el = document.getElementById('user-promo-redemptions');
        const clearAllBtn = document.getElementById('clear-all-user-promos-btn');
        if (!el) return;

        currentUserPromoRedemptions = redemptions || [];

        if (!currentUserPromoRedemptions.length) {
            el.innerHTML = `<p class="text-gray-500">${t('No discount codes used yet.', 'Sin códigos de descuento usados.')}</p>`;
            if (clearAllBtn) clearAllBtn.classList.add('hidden');
            return;
        }

        if (clearAllBtn) clearAllBtn.classList.remove('hidden');

        const rows = currentUserPromoRedemptions.map((r) => {
            const product = promoProductLabel(r.productType);
            const when = fmtDate(r.redeemedAt);
            const freeTag = r.free ? (currentLang === 'es' ? 'gratis' : 'free') : `${r.discountPercent || 0}%`;
            return `<li class="flex items-center justify-between gap-2 py-2 border-b border-gray-100">
                <span><span class="font-mono font-medium">${escapeHtml(r.code)}</span>
                    <span class="text-gray-500"> · ${escapeHtml(product)} · ${escapeHtml(freeTag)} · ${when}</span></span>
                <button type="button" class="clear-user-promo-btn text-xs text-amber-700 hover:underline whitespace-nowrap"
                    data-code="${escapeHtml(r.code)}" data-product="${escapeHtml(r.productType)}">${t('Clear', 'Quitar')}</button>
            </li>`;
        }).join('');

        el.innerHTML = `<ul class="divide-y divide-gray-100">${rows}</ul>`;

        el.querySelectorAll('.clear-user-promo-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                clearUserPromoRedemptions({
                    code: btn.dataset.code,
                    productType: btn.dataset.product,
                });
            });
        });
    }

    async function loadUserPromoRedemptions(userId) {
        const el = document.getElementById('user-promo-redemptions');
        if (el) {
            el.innerHTML = `<p class="text-gray-500">${t('Loading…', 'Cargando…')}</p>`;
        }
        try {
            const data = await callFn('adminListUserPromoRedemptions', { userId });
            renderUserPromoRedemptions(data.redemptions || []);
        } catch (err) {
            console.error(err);
            if (el) {
                el.innerHTML = `<p class="text-red-600">${t('Could not load promo usage.', 'No se pudo cargar el uso de códigos.')}</p>`;
            }
        }
    }

    async function clearUserPromoRedemptions(opts) {
        const userId = document.getElementById('edit-user-id')?.value;
        if (!userId) return;

        const code = opts && opts.code ? opts.code : null;
        const productType = opts && opts.productType ? opts.productType : null;
        const scope = code && productType
            ? `${code} (${promoProductLabel(productType)})`
            : t('all discount code usage', 'todo el uso de códigos');

        if (!confirm(t(
            `Clear ${scope} for this user? They will be able to use those codes again.`,
            `¿Quitar ${scope} para este usuario? Podrá volver a usar esos códigos.`,
        ))) {
            return;
        }

        try {
            const result = await callFn('adminClearUserPromoRedemptions', {
                userId,
                code: code || null,
                productType: productType || null,
            });
            await loadUserPromoRedemptions(userId);
            showToast(t(
                `Cleared ${result.deleted || 0} redemption(s).`,
                `Se quitaron ${result.deleted || 0} uso(s).`,
            ));
        } catch (err) {
            console.error(err);
            alert(err.message || t('Could not clear redemptions.', 'No se pudo quitar el uso.'));
        }
    }

    function openUserModal(uid) {
        const user = usersCache.find((u) => u.uid === uid);
        if (!user) return;
        document.getElementById('edit-user-id').value = uid;
        document.getElementById('edit-user-email').value = user.email || '';
        document.getElementById('edit-display-name').value = user.displayName || '';
        document.getElementById('edit-full-name').value = user.fullName || '';
        document.getElementById('edit-phone').value = user.phone || '';
        document.getElementById('edit-contact-email').value = user.contactEmail || '';

        const toggleBtn = document.getElementById('modal-toggle-user-btn');
        const deleteBtn = document.getElementById('modal-delete-user-btn');
        const protectedUser = user.isAdmin || user.uid === currentAdminUid;
        if (toggleBtn) {
            toggleBtn.classList.toggle('hidden', protectedUser);
            toggleBtn.textContent = user.disabled
                ? t('Activate account', 'Activar cuenta')
                : t('Deactivate account', 'Desactivar cuenta');
            toggleBtn.dataset.uid = uid;
            toggleBtn.dataset.disabled = user.disabled ? '1' : '0';
        }
        if (deleteBtn) {
            deleteBtn.classList.toggle('hidden', protectedUser);
            deleteBtn.dataset.uid = uid;
        }

        loadUserPromoRedemptions(uid).catch(console.error);
        show(document.getElementById('user-modal'), true);
    }

    function closeUserModal() {
        show(document.getElementById('user-modal'), false);
    }

    async function toggleUserDisabled(userId, currentlyDisabled) {
        const action = currentlyDisabled
            ? t('activate this user', 'activar este usuario')
            : t('deactivate this user', 'desactivar este usuario');
        if (!confirm(t(`Are you sure you want to ${action}?`, `¿Está seguro que desea ${action}?`))) {
            return;
        }
        try {
            await callFn('adminSetUserDisabled', { userId, disabled: !currentlyDisabled });
            closeUserModal();
            await loadUsers();
            showToast(currentlyDisabled
                ? t('User activated.', 'Usuario activado.')
                : t('User deactivated.', 'Usuario desactivado.'));
        } catch (err) {
            console.error(err);
            alert(err.message || t('Action failed.', 'La acción falló.'));
        }
    }

    function openDeleteUserModal(userIds) {
        const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [userIds].filter(Boolean);
        if (!ids.length) return;

        pendingDeleteUserIds = ids;
        const users = ids.map((id) => usersCache.find((x) => x.uid === id)).filter(Boolean);
        const listingCount = users.reduce((sum, u) => sum + (u.listingCount || 0), 0);
        const msg = document.getElementById('delete-user-message');

        if (msg) {
            if (ids.length === 1) {
                const u = users[0];
                msg.textContent = t(
                    `Permanently delete ${u?.email || ids[0]}? This removes their account, profile, and ${listingCount} listing(s). This cannot be undone.`,
                    `¿Borrar permanentemente a ${u?.email || ids[0]}? Se eliminarán su cuenta, perfil y ${listingCount} anuncio(s). No se puede deshacer.`,
                );
            } else {
                msg.textContent = t(
                    `Permanently delete ${ids.length} users? This removes their accounts, profiles, and ${listingCount} listing(s). This cannot be undone.`,
                    `¿Borrar permanentemente ${ids.length} usuarios? Se eliminarán sus cuentas, perfiles y ${listingCount} anuncio(s). No se puede deshacer.`,
                );
            }
        }
        show(document.getElementById('delete-user-modal'), true);
    }

    function closeDeleteUserModal() {
        pendingDeleteUserIds = [];
        show(document.getElementById('delete-user-modal'), false);
    }

    async function confirmDeleteUser() {
        if (!pendingDeleteUserIds.length) return;
        const btn = document.getElementById('confirm-delete-user-btn');
        btn.disabled = true;
        try {
            if (pendingDeleteUserIds.length === 1) {
                const result = await callFn('adminDeleteUser', { userId: pendingDeleteUserIds[0] });
                pendingDeleteUserIds.forEach((id) => selectedUserIds.delete(id));
                closeDeleteUserModal();
                closeUserModal();
                await Promise.all([loadUsers(), loadStats()]);
                showToast(t(
                    `User deleted (${result.deletedListings || 0} listings removed).`,
                    `Usuario borrado (${result.deletedListings || 0} anuncios eliminados).`,
                ));
                return;
            }

            const result = await callFn('adminDeleteUsers', { userIds: pendingDeleteUserIds });
            result.deleted.forEach((r) => selectedUserIds.delete(r.userId));
            closeDeleteUserModal();
            closeUserModal();
            await Promise.all([loadUsers(), loadStats()]);

            const deletedCount = result.deleted.length;
            const listingsRemoved = result.totalListingsRemoved || 0;
            let toastMsg = t(
                `${deletedCount} user(s) deleted (${listingsRemoved} listings removed).`,
                `${deletedCount} usuario(s) borrado(s) (${listingsRemoved} anuncios eliminados).`,
            );

            if (result.skipped.length || result.failed.length) {
                const parts = [];
                if (result.skipped.length) {
                    parts.push(t(
                        `${result.skipped.length} skipped (protected).`,
                        `${result.skipped.length} omitido(s) (protegidos).`,
                    ));
                }
                if (result.failed.length) {
                    parts.push(t(
                        `${result.failed.length} failed.`,
                        `${result.failed.length} fallaron.`,
                    ));
                }
                toastMsg += ' ' + parts.join(' ');
            }

            showToast(toastMsg);
        } catch (err) {
            console.error(err);
            alert(err.message || t('Delete failed.', 'Error al borrar.'));
        } finally {
            btn.disabled = false;
        }
    }

    async function saveUserEdits() {
        const userId = document.getElementById('edit-user-id').value;
        const btn = document.getElementById('save-user-btn');
        btn.disabled = true;
        try {
            await callFn('adminUpdateUser', {
                userId,
                displayName: document.getElementById('edit-display-name').value,
                fullName: document.getElementById('edit-full-name').value,
                phone: document.getElementById('edit-phone').value,
                contactEmail: document.getElementById('edit-contact-email').value,
            });
            closeUserModal();
            await loadUsers();
            showToast(t('User updated.', 'Usuario actualizado.'));
        } catch (err) {
            console.error(err);
            alert(t('Failed to update user.', 'Error al actualizar usuario.'));
        } finally {
            btn.disabled = false;
        }
    }

    async function updateListingStatus(listingId, status) {
        try {
            await callFn('adminUpdateListing', { listingId, status });
            showToast(t('Listing updated.', 'Anuncio actualizado.'));
            await loadStats();
        } catch (err) {
            console.error(err);
            alert(t('Failed to update listing.', 'Error al actualizar anuncio.'));
        }
    }

    async function deleteListing(listingId, title) {
        const label = title || listingId;
        if (!confirm(t(
            `Permanently delete "${label}"? This removes the post, photos, and search listing immediately. This cannot be undone.`,
            `¿Borrar permanentemente "${label}"? Se eliminará el anuncio, las fotos y la búsqueda de inmediato. No se puede deshacer.`,
        ))) {
            return;
        }
        try {
            await callFn('adminDeleteListing', { listingId });
            showToast(t('Listing deleted.', 'Anuncio eliminado.'));
            await loadStats();
        } catch (err) {
            console.error(err);
            alert(err.message || t('Failed to delete listing.', 'Error al eliminar anuncio.'));
        }
    }

    async function updateHelpStatus(requestId, status) {
        try {
            await callFn('adminUpdateHelpRequest', { requestId, status });
            showToast(t('Support request updated.', 'Solicitud actualizada.'));
            await loadStats();
        } catch (err) {
            console.error(err);
            alert(t('Failed to update request.', 'Error al actualizar solicitud.'));
        }
    }

    function showToast(msg) {
        const toast = document.getElementById('admin-toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }

    async function loadStats() {
        const data = await callFn('getAdminStats');
        dashboardData = data;
        renderOverview(data);
        renderListingsTable('listings-table', data.recentListings, false);
        renderPaymentsTable('payments-table', data.payments.recent);
        renderOnlineTable('online-table', data.onlineUsers);
        renderHelpTable(data.helpRequests.recent);
    }

    function renderPromosTable(codes) {
        const el = document.getElementById('promos-table');
        if (!el) return;
        if (!codes || !codes.length) {
            el.innerHTML = `<p class="text-gray-500">${t('No promo codes yet. Click "Seed default codes".', 'Sin códigos. Haga clic en "Seed default codes".')}</p>`;
            return;
        }
        const rows = codes.map((c) => {
            const products = (c.productTypes || []).join(', ');
            const status = c.retired
                ? t('Retired', 'Retirado')
                : (c.active === false ? t('Inactive', 'Inactivo') : t('Active', 'Activo'));
            const uses = `${c.useCount || 0}${c.maxUses != null ? ` / ${c.maxUses}` : ''}`;
            return `<tr class="border-b border-gray-100 text-sm">
                <td class="py-2 pr-4 font-mono font-semibold">${c.code || c.id}</td>
                <td class="py-2 pr-4">${c.discountPercent}%</td>
                <td class="py-2 pr-4">${products}</td>
                <td class="py-2 pr-4">${uses}</td>
                <td class="py-2 pr-4">${status}</td>
                <td class="py-2 text-gray-500">${c.label || '—'}</td>
            </tr>`;
        }).join('');
        el.innerHTML = `<table class="w-full text-left">
            <thead><tr class="text-xs text-gray-500 uppercase border-b">
                <th class="pb-2 pr-4">Code</th>
                <th class="pb-2 pr-4">Off</th>
                <th class="pb-2 pr-4">Products</th>
                <th class="pb-2 pr-4">Uses</th>
                <th class="pb-2 pr-4">Status</th>
                <th class="pb-2">Label</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    async function loadPromos() {
        const el = document.getElementById('promos-table');
        if (el) el.innerHTML = `<p class="text-gray-500">${t('Loading…', 'Cargando…')}</p>`;
        const data = await callFn('adminListPromoCodes');
        renderPromosTable(data.codes || []);
    }

    async function seedPromoCodes() {
        const btn = document.getElementById('seed-promo-codes');
        if (btn) btn.disabled = true;
        try {
            const data = await callFn('adminSeedPromoCodes');
            showToast(t(`Created ${data.created}, skipped ${data.skipped}.`, `Creados ${data.created}, omitidos ${data.skipped}.`));
            await loadPromos();
        } catch (err) {
            console.error(err);
            alert(t('Failed to seed promo codes.', 'Error al crear códigos.'));
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function loadUsers(pageToken) {
        const el = document.getElementById('users-table');
        if (el) el.innerHTML = `<p class="text-gray-500">${t('Loading users…', 'Cargando usuarios…')}</p>`;
        const data = await callFn('adminListUsers', { limit: 200, pageToken: pageToken || null });
        renderUsersTable(data.users);
        const moreBtn = document.getElementById('load-more-users');
        if (moreBtn) {
            moreBtn.classList.toggle('hidden', !data.nextPageToken);
            moreBtn.dataset.token = data.nextPageToken || '';
        }
    }

    function checkAdminAndLoad() {
        const loading = document.getElementById('admin-loading');
        const denied = document.getElementById('admin-denied');
        const dashboard = document.getElementById('admin-dashboard');

        if (!window.firebaseAuthInstance || !window.firestoreDbInstance) {
            setTimeout(checkAdminAndLoad, 200);
            return;
        }

        const auth = window.firebaseAuthInstance;
        const db = window.firestoreDbInstance;
        functionsApi = firebase.functions();

        if (!auth.currentUser) {
            show(loading, false);
            show(denied, true);
            return;
        }

        currentAdminUid = auth.currentUser.uid;
        db.collection('admins').doc(currentAdminUid).get().then((doc) => {
            show(loading, false);
            if (!doc.exists) {
                show(denied, true);
                return;
            }
            show(dashboard, true);
            loadStats().catch((err) => {
                console.error('getAdminStats failed:', err);
                alert(t('Error loading dashboard.', 'Error al cargar el panel.'));
            });
            loadUsers().catch((err) => console.error('adminListUsers failed:', err));
        }).catch((err) => {
            console.error('Admin check failed:', err);
            show(loading, false);
            show(denied, true);
        });
    }

    function init() {
        currentLang = window.getPreferredLang ? window.getPreferredLang() : 'es';

        document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                switchTab(btn.dataset.adminTab);
                if (btn.dataset.adminTab === 'promos') {
                    loadPromos().catch(console.error);
                }
            });
        });

        document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
            loadStats().catch(console.error);
        });

        document.getElementById('refresh-users')?.addEventListener('click', () => {
            loadUsers().catch(console.error);
        });

        document.getElementById('refresh-promos')?.addEventListener('click', () => {
            loadPromos().catch(console.error);
        });

        document.getElementById('seed-promo-codes')?.addEventListener('click', () => {
            seedPromoCodes().catch(console.error);
        });

        document.getElementById('users-search')?.addEventListener('input', () => {
            renderUsersTable(usersCache);
        });

        document.getElementById('load-more-users')?.addEventListener('click', (e) => {
            const token = e.target.dataset.token;
            if (token) loadUsers(token).catch(console.error);
        });

        document.getElementById('close-user-modal')?.addEventListener('click', closeUserModal);
        document.getElementById('save-user-btn')?.addEventListener('click', saveUserEdits);
        document.getElementById('clear-all-user-promos-btn')?.addEventListener('click', () => {
            clearUserPromoRedemptions({}).catch(console.error);
        });
        document.getElementById('user-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'user-modal') closeUserModal();
        });
        document.getElementById('modal-toggle-user-btn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            toggleUserDisabled(btn.dataset.uid, btn.dataset.disabled === '1');
        });
        document.getElementById('modal-delete-user-btn')?.addEventListener('click', (e) => {
            openDeleteUserModal([e.currentTarget.dataset.uid]);
        });
        document.getElementById('delete-selected-users')?.addEventListener('click', () => {
            if (!selectedUserIds.size) return;
            openDeleteUserModal([...selectedUserIds]);
        });
        document.getElementById('close-delete-user-modal')?.addEventListener('click', closeDeleteUserModal);
        document.getElementById('confirm-delete-user-btn')?.addEventListener('click', confirmDeleteUser);
        document.getElementById('delete-user-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'delete-user-modal') closeDeleteUserModal();
        });

        setInterval(() => {
            if (document.getElementById('admin-dashboard') && !document.getElementById('admin-dashboard').classList.contains('hidden')) {
                loadStats().catch(() => { /* silent refresh */ });
            }
        }, 60000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            setTimeout(checkAdminAndLoad, 400);
        });
    } else {
        init();
        setTimeout(checkAdminAndLoad, 400);
    }
})();
