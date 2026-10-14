/**
 * Makes sort dropdown easier to spot: label + default options before JS runs.
 * Run: node scripts/enhance-listing-sort-ui.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const OLD = `                                <select id="filter-sort" class="p-2 border border-gray-300 rounded-md filter-select min-w-[11rem]" aria-label="Sort order">
                </select>
`;

const NEW = `                <div class="flex items-center gap-2 shrink-0">
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

function walk(dir, out = []) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p, out);
        else if (p.endsWith('.html')) out.push(p);
    }
    return out;
}

const files = walk(path.join(ROOT, 'pages')).filter((f) => fs.readFileSync(f, 'utf8').includes('id="filter-sort"'));
files.push(path.join(ROOT, 'listing-search.html'));

let updated = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes(OLD)) continue;
    content = content.replace(OLD, NEW);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', path.relative(ROOT, file));
    updated++;
}

console.log(`\nDone. ${updated} file(s) updated.`);
