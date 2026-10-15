/**
 * Sort options for listing search results.
 *
 * Pages that search Algolia should sort server-side by searching the replica from
 * sortIndexName() (see functions/algolia-config.js). sortHits() is the in-browser fallback for
 * pages that still sort one page of hits; it compares prices in USD so ₡ and $ mix correctly.
 */
(function (global) {
    const SORT_OPTIONS = [
        { id: 'newest', en: 'Newest first', es: 'Más recientes' },
        { id: 'oldest', en: 'Oldest first', es: 'Más antiguos' },
        { id: 'price_asc', en: 'Price: low to high', es: 'Precio: menor a mayor' },
        { id: 'price_desc', en: 'Price: high to low', es: 'Precio: mayor a menor' },
    ];

    const DEFAULT_SORT = 'newest';

    // Algolia replica suffix per sort id (must match SORT_REPLICAS in functions/algolia-config.js)
    const REPLICA_SUFFIX = {
        newest: '_newest',
        oldest: '_oldest',
        price_asc: '_price_asc',
        price_desc: '_price_desc',
    };

    function crcPerUsd() {
        const app = global.config && global.config.app;
        return (app && Number(app.crcPerUsd)) || 505;
    }

    /** Price in USD, so colón and dollar listings compare correctly. */
    function getPriceSortValue(hit) {
        if (hit == null) return null;
        if (hit.priceUsd != null && !Number.isNaN(Number(hit.priceUsd))) {
            return Number(hit.priceUsd);
        }
        let amount = null;
        if (hit.priceAmount != null && !Number.isNaN(Number(hit.priceAmount))) {
            amount = Number(hit.priceAmount);
        } else {
            const parsed = parseFloat(String(hit.price || '').replace(/[^0-9.]/g, ''));
            if (!Number.isNaN(parsed)) amount = parsed;
        }
        if (amount == null) return null;
        const isUsd = hit.currency === 'usd' || (!hit.currency && String(hit.price || '').indexOf('$') !== -1);
        return isUsd ? amount : amount / crcPerUsd();
    }

    /** Algolia index (replica) that returns results already in this sort order. */
    function sortIndexName(baseIndexName, sortId) {
        return baseIndexName + (REPLICA_SUFFIX[sortId] || REPLICA_SUFFIX[DEFAULT_SORT]);
    }

    function sortHits(hits, sortId) {
        const arr = Array.isArray(hits) ? [...hits] : [];
        const mode = sortId || DEFAULT_SORT;

        if (mode === 'oldest') {
            return arr.sort((a, b) => (a.createdAtSeconds || 0) - (b.createdAtSeconds || 0));
        }

        if (mode === 'price_asc' || mode === 'price_desc') {
            const dir = mode === 'price_asc' ? 1 : -1;
            return arr.sort((a, b) => {
                const pa = getPriceSortValue(a);
                const pb = getPriceSortValue(b);
                if (pa == null && pb == null) return 0;
                if (pa == null) return 1;
                if (pb == null) return -1;
                return (pa - pb) * dir;
            });
        }

        return arr.sort((a, b) => (b.createdAtSeconds || 0) - (a.createdAtSeconds || 0));
    }

    function populateSortSelect(selectEl, lang) {
        if (!selectEl) return;
        const current = selectEl.value || DEFAULT_SORT;
        selectEl.innerHTML = '';
        const useEs = lang === 'es';
        SORT_OPTIONS.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.id;
            option.textContent = useEs ? opt.es : opt.en;
            selectEl.appendChild(option);
        });
        if (SORT_OPTIONS.some((opt) => opt.id === current)) {
            selectEl.value = current;
        } else {
            selectEl.value = DEFAULT_SORT;
        }
    }

    global.NunciaYaListingSort = {
        SORT_OPTIONS,
        defaultSort: DEFAULT_SORT,
        sortHits,
        sortIndexName,
        getPriceSortValue,
        populateSortSelect,
    };
})(typeof window !== 'undefined' ? window : global);
