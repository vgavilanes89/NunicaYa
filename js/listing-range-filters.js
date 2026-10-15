/**
 * Price and year range filters for category search pages.
 *
 * Renders "Year from / to" (optional) and "Price from / to" with a ₡ / $ selector into a
 * container, and turns them into Algolia numericFilters on priceUsd / yearNumber
 * (derived server-side in functions/algolia-config.js). Prices typed in colones are converted
 * with config.app.crcPerUsd.
 *
 * Usage:
 *   const ranges = NunciaYaListingRanges.mount(el, { year: true, lang, onChange: runSearch });
 *   searchOptions.numericFilters = ranges.getNumericFilters();
 */
(function (global) {
    'use strict';

    const YEAR_MIN = 1960;

    const TEXT = {
        en: { yearFrom: 'Year from', yearTo: 'Year to', priceFrom: 'Min price', priceTo: 'Max price', currency: 'Currency' },
        es: { yearFrom: 'Año desde', yearTo: 'Año hasta', priceFrom: 'Precio mín.', priceTo: 'Precio máx.', currency: 'Moneda' },
    };

    function crcPerUsd() {
        const app = global.config && global.config.app;
        return (app && Number(app.crcPerUsd)) || 505;
    }

    function el(tag, attrs) {
        const node = document.createElement(tag);
        Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, attrs[k]));
        return node;
    }

    function fillYearSelect(select, label, maxYear) {
        const current = select.value;
        select.innerHTML = '';
        const any = el('option', { value: '' });
        any.textContent = label;
        select.appendChild(any);
        for (let y = maxYear; y >= YEAR_MIN; y--) {
            const opt = el('option', { value: String(y) });
            opt.textContent = String(y);
            select.appendChild(opt);
        }
        select.value = current;
    }

    function parseAmount(input) {
        const raw = String(input.value || '').replace(/[^0-9.]/g, '');
        if (raw === '') return null;
        const n = Number(raw);
        return Number.isFinite(n) && n >= 0 ? n : null;
    }

    function mount(container, opts) {
        const options = opts || {};
        let lang = options.lang === 'en' ? 'en' : 'es';
        const onChange = typeof options.onChange === 'function' ? options.onChange : function () {};
        const maxYear = new Date().getFullYear() + 1;
        const selectClass = 'p-2 border border-gray-300 rounded-md filter-select';
        const inputClass = 'p-2 border border-gray-300 rounded-md filter-input w-full';

        container.classList.add('grid', 'grid-cols-2', 'gap-4', 'mt-4');
        container.classList.add(options.year ? 'md:grid-cols-5' : 'md:grid-cols-3');

        let yearFrom = null;
        let yearTo = null;
        if (options.year) {
            yearFrom = el('select', { class: selectClass, 'data-range': 'year-from' });
            yearTo = el('select', { class: selectClass, 'data-range': 'year-to' });
            container.appendChild(yearFrom);
            container.appendChild(yearTo);
        }
        const priceFrom = el('input', { type: 'number', min: '0', step: 'any', inputmode: 'numeric', class: inputClass, 'data-range': 'price-from' });
        const priceTo = el('input', { type: 'number', min: '0', step: 'any', inputmode: 'numeric', class: inputClass, 'data-range': 'price-to' });
        const currency = el('select', { class: selectClass, 'data-range': 'currency' });
        [['crc', '₡ CRC'], ['usd', '$ USD']].forEach(([value, label]) => {
            const opt = el('option', { value });
            opt.textContent = label;
            currency.appendChild(opt);
        });
        container.appendChild(priceFrom);
        container.appendChild(priceTo);
        container.appendChild(currency);

        function applyLang() {
            const t = TEXT[lang];
            if (yearFrom) {
                fillYearSelect(yearFrom, t.yearFrom, maxYear);
                fillYearSelect(yearTo, t.yearTo, maxYear);
                yearFrom.setAttribute('aria-label', t.yearFrom);
                yearTo.setAttribute('aria-label', t.yearTo);
            }
            priceFrom.placeholder = t.priceFrom;
            priceTo.placeholder = t.priceTo;
            priceFrom.setAttribute('aria-label', t.priceFrom);
            priceTo.setAttribute('aria-label', t.priceTo);
            currency.setAttribute('aria-label', t.currency);
        }
        applyLang();

        // Selects apply immediately; typed prices apply after a short pause or on Enter.
        let debounce = null;
        function scheduleChange() {
            clearTimeout(debounce);
            debounce = setTimeout(onChange, 600);
        }
        [yearFrom, yearTo, currency].forEach((s) => s && s.addEventListener('change', onChange));
        [priceFrom, priceTo].forEach((input) => {
            input.addEventListener('input', scheduleChange);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(debounce);
                    onChange();
                }
            });
        });

        function getNumericFilters() {
            const filters = [];
            if (yearFrom) {
                let from = yearFrom.value ? Number(yearFrom.value) : null;
                let to = yearTo.value ? Number(yearTo.value) : null;
                if (from != null && to != null && from > to) [from, to] = [to, from];
                if (from != null) filters.push(`yearNumber>=${from}`);
                if (to != null) filters.push(`yearNumber<=${to}`);
            }
            const rate = currency.value === 'usd' ? 1 : crcPerUsd();
            let min = parseAmount(priceFrom);
            let max = parseAmount(priceTo);
            if (min != null && max != null && min > max) [min, max] = [max, min];
            if (min != null) filters.push(`priceUsd>=${Math.floor((min / rate) * 100) / 100}`);
            if (max != null) filters.push(`priceUsd<=${Math.ceil((max / rate) * 100) / 100}`);
            return filters;
        }

        function reset() {
            clearTimeout(debounce);
            if (yearFrom) {
                yearFrom.value = '';
                yearTo.value = '';
            }
            priceFrom.value = '';
            priceTo.value = '';
            currency.value = 'crc';
        }

        function setLang(nextLang) {
            lang = nextLang === 'en' ? 'en' : 'es';
            applyLang();
        }

        return { getNumericFilters, reset, setLang };
    }

    global.NunciaYaListingRanges = { mount };
})(typeof window !== 'undefined' ? window : global);
