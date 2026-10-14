/**
 * Firestore fallback when Algolia search index is empty or out of sync.
 */
(function (global) {
    'use strict';

    function timestampToSeconds(ts) {
        if (!ts) return null;
        if (typeof ts.toMillis === 'function') return Math.floor(ts.toMillis() / 1000);
        if (typeof ts.seconds === 'number') return ts.seconds;
        return null;
    }

    function docToHit(id, data) {
        const hit = Object.assign({ objectID: id }, data);
        const createdAtSeconds = timestampToSeconds(data.createdAt);
        if (createdAtSeconds != null) hit.createdAtSeconds = createdAtSeconds;
        const expiresAtSeconds = timestampToSeconds(data.expiresAt);
        if (expiresAtSeconds != null) hit.expiresAtSeconds = expiresAtSeconds;
        const publicVisibleUntilSeconds = timestampToSeconds(data.publicVisibleUntil);
        if (publicVisibleUntilSeconds != null) {
            hit.publicVisibleUntilSeconds = publicVisibleUntilSeconds;
        } else if (expiresAtSeconds != null) {
            hit.publicVisibleUntilSeconds = expiresAtSeconds;
        }
        return hit;
    }

    function isPubliclyVisible(hit, nowSeconds) {
        const now = nowSeconds || Math.floor(Date.now() / 1000);
        if (hit.publicVisibleUntilSeconds != null) {
            return hit.publicVisibleUntilSeconds > now;
        }
        return hit.status !== 'sold' && hit.status !== 'hidden' && hit.status !== 'pending';
    }

    function matchesSearchText(hit, searchText) {
        const raw = String(searchText || '').trim();
        if (!raw) return true;
        const tokens = raw.toLowerCase().split(/\s+/).filter(Boolean);
        const hay = [
            hit.title_en,
            hit.title_es,
            hit.description_en,
            hit.description_es,
            hit.category,
            hit.subCategory,
            hit.make,
            hit.model,
            hit.zone,
            hit.canton,
            hit.district,
        ].filter(Boolean).join(' ').toLowerCase();
        return tokens.every((tok) => hay.includes(tok));
    }

    function matchesClientFilters(hit, opts) {
        if (opts.subCategory && hit.subCategory !== opts.subCategory) return false;
        if (opts.zone && hit.zone !== opts.zone) return false;
        if (opts.canton && hit.canton !== opts.canton) return false;
        if (opts.district && hit.district !== opts.district) return false;
        if (opts.condition && hit.condition !== opts.condition) return false;
        if (opts.type && hit.type !== opts.type) return false;
        if (!matchesSearchText(hit, opts.searchText)) return false;
        return true;
    }

    async function fetchListingDocs(db, maxScan) {
        try {
            return await db.collection('listings')
                .orderBy('createdAt', 'desc')
                .limit(maxScan)
                .get();
        } catch (err) {
            console.warn('Firestore orderBy(createdAt) failed, using unordered fetch:', err.message);
            return db.collection('listings').limit(maxScan).get();
        }
    }

    function filterHits(docs, opts) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const limit = opts.hitsPerPage || 50;
        return docs
            .map((doc) => docToHit(doc.id, doc.data()))
            .filter((hit) => isPubliclyVisible(hit, nowSeconds))
            .filter((hit) => matchesClientFilters(hit, opts))
            .slice(0, limit);
    }

    /**
     * Category page search (subCategory required).
     */
    async function searchFirestore(db, opts) {
        if (!db || !opts || !opts.subCategory) return [];

        const limit = opts.hitsPerPage || 50;
        const snap = await db.collection('listings')
            .where('subCategory', '==', opts.subCategory)
            .limit(Math.min(limit * 5, 200))
            .get();

        return filterHits(snap.docs, opts);
    }

    /**
     * Site-wide search (homepage / listing-search.html).
     */
    async function searchFirestoreGlobal(db, opts) {
        if (!db) return [];

        const maxScan = opts.maxScan || 500;
        const snap = await fetchListingDocs(db, maxScan);
        return filterHits(snap.docs, opts || {});
    }

    global.NunciaYaFirestoreListingSearch = {
        docToHit,
        isPubliclyVisible,
        matchesSearchText,
        searchFirestore,
        searchFirestoreGlobal,
    };
}(window));
