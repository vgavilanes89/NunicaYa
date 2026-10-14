/**
 * Client-side sort for Algolia listing search results.
 */
(function (global) {
    const SORT_OPTIONS = [
        { id: 'newest', en: 'Newest first', es: 'Más recientes' },
        { id: 'oldest', en: 'Oldest first', es: 'Más antiguos' },
        { id: 'price_asc', en: 'Price: low to high', es: 'Precio: menor a mayor' },
        { id: 'price_desc', en: 'Price: high to low', es: 'Precio: mayor a menor' },
    ];

    const DEFAULT_SORT = 'newest';

    function getPriceSortValue(hit) {
        if (hit == null) return null;
        if (hit.priceAmount != null && !Number.isNaN(Number(hit.priceAmount))) {
            return Number(hit.priceAmount);
        }
        const parsed = parseFloat(String(hit.price || '').replace(/[^0-9.]/g, ''));
        return Number.isNaN(parsed) ? null : parsed;
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
        populateSortSelect,
    };
})(typeof window !== 'undefined' ? window : global);
