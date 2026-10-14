/**
 * Moves sort dropdown from search row to view toolbar (left: views, right: sort).
 * Run: node scripts/move-listing-sort-toolbar.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SORT_FROM_SEARCH = `                <div class="flex items-center gap-2 shrink-0">
                    <span class="text-sm font-medium text-gray-700 whitespace-nowrap">
                        <span class="lang-en">Sort</span>
                        <span class="lang-es">Ordenar</span>
                    </span>
                    <select id="filter-sort" class="p-2 border border-gray-300 rounded-md filter-select min-w-[11rem]" aria-label="Sort order">
                        <option value="newest">Más recientes</option>
                        <option value="oldest">Más antiguos</option>
                        <option value="price_asc">Precio: menor a mayor</option>
                        <option value="price_desc">Precio: mayor a menor</option>
                    </select>
                </div>

`;

const SORT_IN_TOOLBAR = `            <div class="flex items-center gap-2 shrink-0 listing-toolbar-sort">
                <span class="text-sm font-medium text-gray-700 whitespace-nowrap">
                    <span class="lang-en">Sort</span>
                    <span class="lang-es">Ordenar</span>
                </span>
                <select id="filter-sort" class="p-2 border border-gray-300 rounded-md filter-select min-w-[11rem]" aria-label="Sort order">
                    <option value="newest">Más recientes</option>
                    <option value="oldest">Más antiguos</option>
                    <option value="price_asc">Precio: menor a mayor</option>
                    <option value="price_desc">Precio: mayor a menor</option>
                </select>
            </div>`;

function walk(dir, out = []) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p, out);
        else if (p.endsWith('.html')) out.push(p);
    }
    return out;
}

function patch(content) {
    if (content.includes('listing-toolbar-sort')) return content;

    if (content.includes(SORT_FROM_SEARCH)) {
        content = content.replace(SORT_FROM_SEARCH, '');
    }

    if (!content.includes('class="flex justify-end items-center mb-4 space-x-2"')) {
        console.warn('  View toolbar pattern not found');
        return content;
    }

    content = content.replace(
        /<div class="flex justify-end items-center mb-4 space-x-2">\s*\n\s*<span class="text-sm font-medium text-gray-700">/,
        '<div class="flex justify-between items-center mb-4 flex-wrap gap-3">\n            <div class="flex items-center space-x-2">\n                <span class="text-sm font-medium text-gray-700">'
    );

    content = content.replace(
        /(<button id="view-toggle-grid" class="view-toggle-btn" aria-label="Grid view">[\s\S]*?<\/button>)\s*\n(\s*<\/div>)/,
        `$1\n            </div>\n${SORT_IN_TOOLBAR}\n$2`
    );

    return content;
}

const files = walk(path.join(ROOT, 'pages')).filter((f) => fs.readFileSync(f, 'utf8').includes('id="filter-sort"'));
files.push(path.join(ROOT, 'listing-search.html'));

let updated = 0;
for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    const after = patch(before);
    if (after !== before) {
        fs.writeFileSync(file, after, 'utf8');
        console.log('Updated:', path.relative(ROOT, file));
        updated++;
    }
}

console.log(`\nDone. ${updated} file(s) updated.`);
