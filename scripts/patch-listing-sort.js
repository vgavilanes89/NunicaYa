/**
 * Adds sort dropdown + client-side sort hook to all listing search pages.
 * Run: node scripts/patch-listing-sort.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SORT_HTML = `                <select id="filter-sort" class="p-2 border border-gray-300 rounded-md filter-select min-w-[11rem]" aria-label="Sort order">
                </select>
`;

const SORT_VAR = `        const filterSort = document.getElementById('filter-sort');
`;

const SORT_AFTER_HITS = `                const sortedHits = window.NunciaYaListingSort
                    ? NunciaYaListingSort.sortHits(hits, filterSort ? filterSort.value : 'newest')
                    : hits;
`;

const SORT_RESET = `            if (filterSort && window.NunciaYaListingSort) {
                filterSort.value = NunciaYaListingSort.defaultSort;
            }

`;

const SORT_LISTENER = `                    if (filterSort) filterSort.addEventListener('change', runSearch);
`;

const SORT_SETLANG = `            if (window.NunciaYaListingSort && filterSort) {
                NunciaYaListingSort.populateSortSelect(filterSort, currentLang);
            }
`;

const SORT_INIT_AFTER_SETLANG = `                    if (window.NunciaYaListingSort && filterSort) {
                        NunciaYaListingSort.populateSortSelect(filterSort, currentLang);
                    }
`;

function walk(dir, out = []) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p, out);
        else if (p.endsWith('.html')) out.push(p);
    }
    return out;
}

function assetPrefix(filePath) {
    const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
    if (rel === 'listing-search.html') return './';
    return '../../';
}

function injectHead(content, prefix) {
    if (content.includes('listing-sort.js')) return content;
    return content.replace(
        /(<script src="[^"]*listing-radius-filter\.js"><\/script>)/,
        `$1\n    <script src="${prefix}js/listing-sort.js"></script>`
    );
}

function injectHtml(content) {
    if (content.includes('id="filter-sort"')) return content;
    return content.replace(
        /(\s*)(<!-- NEW: Reset Button -->\s*\n\s*<button id="reset-button")/,
        `$1${SORT_HTML}$1$2`
    );
}

function injectFilterSortVar(content) {
    if (content.includes("getElementById('filter-sort')")) return content;
    return content.replace(
        /(const filterDistrict = document\.getElementById\('filter-district'\);)/,
        `$1\n${SORT_VAR}`
    );
}

function injectCategorySearchSort(content) {
    if (content.includes('NunciaYaListingSort.sortHits')) return content;
    return content.replace(
        /(console\.log\("Algolia hits found:", hits\.length\);\s*\n\s*)renderListings\(hits\);/,
        `$1${SORT_AFTER_HITS}                renderListings(sortedHits);`
    );
}

function injectListingSearchSort(content) {
    if (content.includes('NunciaYaListingSort.sortHits')) return content;
    let next = content.replace(
        /(const \{ hits \} = await algoliaIndex\.search\(searchText, searchOptions\);[\s\S]*?)\n(\s*loadingMsg\.style\.display = 'none';)/,
        `$1\n${SORT_AFTER_HITS}$2`
    );
    if (next === content) return content;
    next = next.replace(/\bhits\.length === 0\b/g, 'sortedHits.length === 0');
    next = next.replace(/\bhits\.forEach\(/g, 'sortedHits.forEach(');
    return next;
}

function injectReset(content) {
    if (content.includes('NunciaYaListingSort.defaultSort')) return content;

    const patterns = [
        /(filterDistrict\.value = "";\s*\n)(\s*runSearch\(\);\s*\n\s*\}\s*\n\s*\n\s*\/\/ --- Algolia)/,
        /(updateSearchQueryDisplay\(""\);\s*\n\s*\n)(\s*\/\/ Run a new search with no filters\s*\n\s*runSearch\(\);)/,
        /(filterDistrict\.value = "";\s*\n)(\s*runSearch\(\);\s*\n\s*\}\s*\n\s*\n\s*\/\/ Escape)/,
    ];

    for (const pattern of patterns) {
        if (pattern.test(content)) {
            return content.replace(pattern, `$1${SORT_RESET}$2`);
        }
    }

    console.warn('  Could not inject reset hook');
    return content;
}

function injectListener(content) {
    if (content.includes("filterSort.addEventListener('change', runSearch)")) return content;
    return content.replace(
        /(filterDistrict\.addEventListener\('change', runSearch\);)/,
        `$1\n${SORT_LISTENER}`
    );
}

function injectSetLang(content) {
    if (content.includes('NunciaYaListingSort.populateSortSelect')) return content;
    return content.replace(
        /(if \(selectedCanton\) \{\s*\n\s*populateDistricts\(selectedZone, selectedCanton\);\s*\n\s*filterDistrict\.value = selectedDistrict;\s*\n\s*\}\s*\n\s*\})/,
        `$1\n${SORT_SETLANG}`
    );
}

function injectInit(content) {
    if (content.includes('populateSortSelect(filterSort, currentLang)')) return content;

    const patterns = [
        /(if \(window\.setLang\) \{\s*\n\s*window\.setLang\(currentLang\);\s*\n\s*console\.log\("Initial language set\."\);\s*\n\s*\})/,
        /(if\(window\.setLang\) \{\s*\n\s*window\.setLang\(currentLang\);\s*\n\s*\})/,
    ];

    for (const pattern of patterns) {
        if (pattern.test(content)) {
            return content.replace(pattern, `$1\n${SORT_INIT_AFTER_SETLANG}`);
        }
    }

    return content;
}

const files = walk(path.join(ROOT, 'pages')).filter((f) => {
    const c = fs.readFileSync(f, 'utf8');
    return c.includes('id="filter-zone"');
});
files.push(path.join(ROOT, 'listing-search.html'));

let updated = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const before = content;
    const prefix = assetPrefix(file);
    const isListingSearch = path.basename(file) === 'listing-search.html';

    content = injectHead(content, prefix);
    content = injectHtml(content);
    content = injectFilterSortVar(content);
    content = isListingSearch ? injectListingSearchSort(content) : injectCategorySearchSort(content);
    content = injectReset(content);
    content = injectListener(content);
    content = injectSetLang(content);
    content = injectInit(content);

    if (content !== before) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', path.relative(ROOT, file));
        updated++;
    } else {
        console.log('Skipped (no changes):', path.relative(ROOT, file));
    }
}

console.log(`\nDone. ${updated} file(s) updated.`);
