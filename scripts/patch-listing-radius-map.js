/**
 * Adds radius mini-map assets + HTML + Algolia geo hook to all listing search pages.
 * Run: node scripts/patch-listing-radius-map.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const MAP_HTML = `
            <!-- Radius mini map -->
            <div id="radius-map-section" class="mt-4 pt-4 border-t border-gray-200">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <label for="filter-radius" class="text-sm font-medium text-gray-700">
                        <span class="lang-en">Search radius</span>
                        <span class="lang-es">Radio de búsqueda</span>
                    </label>
                    <span id="radius-value-label" class="text-sm font-semibold text-blue-700">10 km</span>
                </div>
                <input type="range" id="filter-radius" class="radius-slider w-full mb-3" min="1" max="50" value="10" step="1">
                <div id="radius-mini-map" class="w-full rounded-md border border-gray-300 overflow-hidden bg-gray-100"></div>
                <p class="text-xs text-gray-500 mt-2">
                    <span class="lang-en">Select a province to center the map. The circle shows the search radius from that area.</span>
                    <span class="lang-es">Seleccione una provincia para centrar el mapa. El círculo muestra el radio de búsqueda desde esa zona.</span>
                </p>
            </div>`;

const MAP_CSS = `
        #radius-mini-map {
            height: 12rem;
            min-height: 12rem;
        }
        .radius-slider {
            accent-color: #2563eb;
        }`;

const SEARCH_OLD = `                const { hits } = await algoliaIndex.search(searchText, {
                    filters: filters,
                    hitsPerPage: 50
                });`;

const SEARCH_NEW = `                const searchOptions = {
                    filters: filters,
                    hitsPerPage: 50
                };
                if (window.NunciaYaListingRadiusFilter) {
                    NunciaYaListingRadiusFilter.applyToSearchOptions(searchOptions, filterZone.value);
                }
                const { hits } = await algoliaIndex.search(searchText, searchOptions);`;

const SEARCH_OLD2 = `                const { hits } = await algoliaIndex.search(searchText, {
                    filters: filters,
                    hitsPerPage: 50,
                });`;

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
    if (content.includes('listing-radius-filter.js')) return content;

    const leafletBlock = `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
    <script src="${prefix}js/location-coords-cr.js"></script>
    <script src="${prefix}js/radius-map.js"></script>
    <script src="${prefix}js/listing-radius-filter.js"></script>`;

    if (content.includes('location-coords-cr.js')) {
        return content.replace(
            /<script src="[^"]*location-coords-cr\.js"><\/script>\s*(\n\s*<!-- Leaflet for radius mini map -->[\s\S]*?<script src="[^"]*listing-radius-filter\.js"><\/script>)?/,
            `<script src="${prefix}js/location-coords-cr.js"></script>${leafletBlock.replace(`<script src="${prefix}js/location-coords-cr.js"></script>`, '')}`
        );
    }

    return content.replace(
        /(<script src="[^"]*locations-cr\.js"><\/script>)/,
        `$1${leafletBlock}`
    );
}

function injectCss(content) {
    if (content.includes('#radius-mini-map')) return content;
    return content.replace(/\n    <\/style>/, `${MAP_CSS}\n    </style>`);
}

function injectHtml(content) {
    if (content.includes('id="radius-map-section"')) return content;

    const marker = /(\s*<\/select>\s*\n\s*<\/div>\s*\n)(\s*<\/div>\s*\n\s*\n\s*<!--[\s\S]*?View Toggle)/;
    if (marker.test(content)) {
        return content.replace(marker, `$1${MAP_HTML}\n        </div>\n$2`.replace('\n        </div>\n        </div>', '\n        </div>'));
    }

    const marker2 = /(id="filter-district"[\s\S]*?<\/select>\s*\n\s*<\/div>\s*\n)(        <\/div>)/;
    if (marker2.test(content)) {
        return content.replace(marker2, `$1${MAP_HTML}\n$2`);
    }

    console.warn('  Could not inject HTML block');
    return content;
}

function injectSearch(content) {
    if (content.includes('NunciaYaListingRadiusFilter')) return content;
    if (content.includes(SEARCH_OLD)) return content.replace(SEARCH_OLD, SEARCH_NEW);
    if (content.includes(SEARCH_OLD2)) return content.replace(SEARCH_OLD2, SEARCH_NEW);
    console.warn('  Could not inject search hook');
    return content;
}

function stripAutomotiveInline(content) {
    if (!content.includes('automotive.html page script')) return content;

    content = content.replace(/\n        const filterRadius = document[^\n]+\n        const radiusValueLabel = document[^\n]+\n        \n        let radiusMapReady = false;\n        let mapSearchCenter = null;\n/, '\n');
    content = content.replace(/\n        function updateRadiusLabel[\s\S]*?        function initRadiusMap\(\) \{[\s\S]*?        \}\n\n        \/\/ --- View Toggler/, '\n        // --- View Toggler');
    content = content.replace(/\n            if \(filterRadius\) filterRadius\.value = "10";\n            updateRadiusLabel\(10\);\n            mapSearchCenter = null;\n            if \(radiusMapReady && window\.NunciaYaRadiusMap\) \{\n                NunciaYaRadiusMap\.showDefaultView\(\);\n            \}\n/, '\n            if (window.NunciaYaListingRadiusFilter) NunciaYaListingRadiusFilter.reset();\n');
    content = content.replace(/                        updateRadiusMapFromFilters\(\);\n                        /g, '');
    content = content.replace(/\n                    initRadiusMap\(\);\n/, '\n                    if (window.NunciaYaListingRadiusFilter) NunciaYaListingRadiusFilter.init();\n');
    content = content.replace(/\n                populateProvinces\(\);\n                populateCantons\(''\);\n                populateDistricts\('', ''\);\n            \} else \{/, '\n                populateProvinces();\n                populateCantons(\'\');\n                populateDistricts(\'\', \'\');\n                if (window.NunciaYaListingRadiusFilter) NunciaYaListingRadiusFilter.init();\n            } else {');

    content = content.replace(/                const searchOptions = \{\n                    filters: filters,\n                    hitsPerPage: 50\n                \};\n\n                if \(mapSearchCenter && selectedZone\) \{\n                    searchOptions\.aroundLatLng = `\$\{mapSearchCenter\.lat\}, \$\{mapSearchCenter\.lng\}`;\n                    searchOptions\.aroundRadius = radiusKm \* 1000;\n                \}\n\n                const \{ hits \} = await algoliaIndex\.search\(searchText, searchOptions\);/,
        SEARCH_NEW.replace('                const { hits } = await algoliaIndex.search(searchText, searchOptions);', '                const { hits } = await algoliaIndex.search(searchText, searchOptions);'));

    content = content.replace(/\n            const radiusKm = parseInt\(filterRadius\.value, 10\) \|\| 10;\n/, '\n');

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

    content = injectHead(content, prefix);
    content = injectCss(content);
    content = injectHtml(content);
    content = injectSearch(content);
    content = stripAutomotiveInline(content);

    if (content !== before) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', path.relative(ROOT, file));
        updated++;
    } else {
        console.log('Skipped (no changes):', path.relative(ROOT, file));
    }
}

console.log(`\nDone. ${updated} file(s) updated.`);
