/**
 * Creates pets, sportingGoods, and cleaningMoving listing pages from templates.
 * Run: node scripts/create-new-categories.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function replaceAll(content, pairs) {
    let out = content;
    for (const [from, to] of pairs) {
        out = out.split(from).join(to);
    }
    return out;
}

function writeFromTemplate(templatePath, destPath, pairs) {
    const content = replaceAll(fs.readFileSync(templatePath, 'utf8'), pairs);
    fs.writeFileSync(destPath, content, 'utf8');
    console.log('Created:', path.relative(ROOT, destPath));
}

const electronicsTemplate = path.join(ROOT, 'pages/For Sale/electronics.html');
const computerTemplate = path.join(ROOT, 'pages/Services/computer.html');

// --- Pets (type filter, no condition) ---
const petsTypeOptions = `                <select id="filter-type" class="p-2 border border-gray-300 rounded-md filter-select">
                    <option value="" id="all-types-option"></option>
                    <option value="dogs" id="type-dogs-option"></option>
                    <option value="cats" id="type-cats-option"></option>
                    <option value="birds" id="type-birds-option"></option>
                    <option value="fish" id="type-fish-option"></option>
                    <option value="farm" id="type-farm-option"></option>
                    <option value="other" id="type-other-option"></option>
                </select>`;

let pets = fs.readFileSync(electronicsTemplate, 'utf8');
pets = replaceAll(pets, [
    ['NunciaYa - Electronics', 'NunciaYa - Pets'],
    ['=== UPDATED: Search and Filters (for Electronics)', '=== Search and Filters (for Pets)'],
    ["const PAGE_SUB_CATEGORY = 'electronics';", "const PAGE_SUB_CATEGORY = 'pets';"],
    ["'search-input': { en: 'Search electronics...', es: 'Buscar electrónicos...' },", "'search-input': { en: 'Search pets...', es: 'Buscar mascotas...' },"],
    ['Electronics', 'Pets'],
    ['Electrónicos', 'Mascotas'],
    ['<!-- Filter Dropdowns - 5 filters, using 5-col layout -->', '<!-- Filter Dropdowns - 4 filters -->'],
    ['md:grid-cols-5', 'md:grid-cols-4'],
    [`                <!-- Electronics-Specific Filters -->
                <select id="filter-condition" class="p-2 border border-gray-300 rounded-md filter-select">
                    <option value="" id="all-conditions-option"></option>
                    <option value="new" id="condition-new-option"></option>
                    <option value="used" id="condition-used-option"></option>
                </select>
                
                <!-- NEW: Electronics Type Filter -->
                <select id="filter-type" class="p-2 border border-gray-300 rounded-md filter-select">
                    <option value="" id="all-types-option"></option>
                    <option value="cellphones" id="type-cellphones-option"></option>
                    <option value="computers" id="type-computers-option"></option>
                    <option value="tvs" id="type-tvs-option"></option>
                    <option value="audio_video" id="type-audio_video-option"></option>
                    <option value="gaming" id="type-gaming-option"></option>
                    <option value="cell_accessories" id="type-cell_accessories-option"></option>
                    <option value="comp_accessories" id="type-comp_accessories-option"></option>
                    <option value="other" id="type-other-option"></option>
                </select>`, `                <!-- Pets Type Filter -->
${petsTypeOptions}`],
    [`            'all-conditions-option': { en: 'All Conditions', es: 'Todas las Cond.' },
            'condition-new-option': { en: 'New', es: 'Nuevo' },
            'condition-used-option': { en: 'Used', es: 'Usado' },
            'all-types-option': { en: 'All Types', es: 'Todos los Tipos' },
            'type-cellphones-option': { en: 'Cell Phones', es: 'Celulares' },
            'type-computers-option': { en: 'Computers', es: 'Computadoras' },
            'type-tvs-option': { en: 'TVs', es: 'Televisores' },
            'type-audio_video-option': { en: 'Audio & Video', es: 'Audio y Video' },
            'type-gaming-option': { en: 'Video Games', es: 'Videojuegos' },
            'type-cell_accessories-option': { en: 'Cell Accessories', es: 'Acc. Celulares' },
            'type-comp_accessories-option': { en: 'Comp. Accessories', es: 'Acc. Computo' },
            'type-other-option': { en: 'Other', es: 'Otros' }`, `            'all-types-option': { en: 'All Types', es: 'Todos los Tipos' },
            'type-dogs-option': { en: 'Dogs', es: 'Perros' },
            'type-cats-option': { en: 'Cats', es: 'Gatos' },
            'type-birds-option': { en: 'Birds', es: 'Aves' },
            'type-fish-option': { en: 'Fish & Aquatics', es: 'Peces y Acuáticos' },
            'type-farm-option': { en: 'Farm Animals', es: 'Animales de Granja' },
            'type-other-option': { en: 'Other', es: 'Otro' }`],
    ['// --- Electronics-specific filters ---', '// --- Pets-specific filters ---'],
    ['const filterCondition = document.getElementById(\'filter-condition\');\n        const filterType = document.getElementById(\'filter-type\'); // NEW', 'const filterType = document.getElementById(\'filter-type\');'],
    ['// Update condition text\n             document.querySelectorAll(\'.listing-condition\').forEach(el => {\n                 if (el.dataset.condition) {\n                    const condition_en = el.dataset.condition === \'new\' ? \'New\' : \'Used\';\n                    const condition_es = el.dataset.condition === \'new\' ? \'Nuevo\' : \'Usado\';\n                    el.textContent = `/ ${currentLang === \'es\' ? condition_es : condition_en}`;\n                 }\n             });\n\n            ', ''],
    ['// --- Reset Electronics filters ---\n            filterCondition.value = "";\n            filterType.value = ""; // NEW', '// --- Reset Pets filters ---\n            filterType.value = "";'],
    ['// *** Electronics-specific filter logic ***\n            const selectedCondition = filterCondition.value;\n            if (selectedCondition) {\n                filterParts.push(`condition:"${selectedCondition}"`);\n            }\n            \n            const selectedType = filterType.value; // NEW', 'const selectedType = filterType.value;'],
    ['// *** Electronics-specific filter listeners ***\n                    filterCondition.addEventListener(\'change\', runSearch);\n                    filterType.addEventListener(\'change\', runSearch); // NEW', '// *** Pets-specific filter listeners ***\n                    filterType.addEventListener(\'change\', runSearch);'],
    ['modalLoginBtn.href = `../../my-account.html?redirect=pages/for-sale/electronics.html`;', 'modalLoginBtn.href = `../../my-account.html?redirect=pages/for-sale/pets.html`;'],
    ['Shows \'condition\'', 'Shows pet type'],
    ['const condition_en = listing.condition === \'new\' ? \'New\' : \'Used\';\n            const condition_es = listing.condition === \'new\' ? \'Nuevo\' : \'Usado\';\n            const conditionText = listing.condition ? ` / ${currentLang === \'es\' ? condition_es : condition_en}` : \'\';\n            const conditionHTML = listing.condition ? `<span class="listing-condition" data-condition="${listing.condition}">${conditionText}</span>` : \'\';', 'const typeLabels = { dogs: { en: \'Dogs\', es: \'Perros\' }, cats: { en: \'Cats\', es: \'Gatos\' }, birds: { en: \'Birds\', es: \'Aves\' }, fish: { en: \'Fish\', es: \'Peces\' }, farm: { en: \'Farm\', es: \'Granja\' }, other: { en: \'Other\', es: \'Otro\' } };\n            const typeLabel = listing.type && typeLabels[listing.type] ? typeLabels[listing.type][currentLang === \'es\' ? \'es\' : \'en\'] : \'\';\n            const conditionHTML = typeLabel ? `<span class="listing-type text-gray-600"> / ${typeLabel}</span>` : \'\';'],
    ['console.log("Firebase instances assigned for electronics.");', 'console.log("Firebase instances assigned for pets.");'],
]);
fs.writeFileSync(path.join(ROOT, 'pages/For Sale/pets.html'), pets, 'utf8');
console.log('Created: pages/For Sale/pets.html');

// --- Sporting Goods ---
const sportingTypeOptions = `                <select id="filter-type" class="p-2 border border-gray-300 rounded-md filter-select">
                    <option value="" id="all-types-option"></option>
                    <option value="bikes" id="type-bikes-option"></option>
                    <option value="surf" id="type-surf-option"></option>
                    <option value="fishing" id="type-fishing-option"></option>
                    <option value="gym" id="type-gym-option"></option>
                    <option value="camping" id="type-camping-option"></option>
                    <option value="other" id="type-other-option"></option>
                </select>`;

writeFromTemplate(electronicsTemplate, path.join(ROOT, 'pages/For Sale/sportingGoods.html'), [
    ['NunciaYa - Electronics', 'NunciaYa - Sporting Goods'],
    ['=== UPDATED: Search and Filters (for Electronics)', '=== Search and Filters (for Sporting Goods)'],
    ["const PAGE_SUB_CATEGORY = 'electronics';", "const PAGE_SUB_CATEGORY = 'sportingGoods';"],
    ["'search-input': { en: 'Search electronics...', es: 'Buscar electrónicos...' },", "'search-input': { en: 'Search sporting goods...', es: 'Buscar artículos deportivos...' },"],
    ['Electronics', 'Sporting Goods'],
    ['Electrónicos', 'Artículos Deportivos'],
    [`                <!-- NEW: Electronics Type Filter -->
                <select id="filter-type" class="p-2 border border-gray-300 rounded-md filter-select">
                    <option value="" id="all-types-option"></option>
                    <option value="cellphones" id="type-cellphones-option"></option>
                    <option value="computers" id="type-computers-option"></option>
                    <option value="tvs" id="type-tvs-option"></option>
                    <option value="audio_video" id="type-audio_video-option"></option>
                    <option value="gaming" id="type-gaming-option"></option>
                    <option value="cell_accessories" id="type-cell_accessories-option"></option>
                    <option value="comp_accessories" id="type-comp_accessories-option"></option>
                    <option value="other" id="type-other-option"></option>
                </select>`, `                <!-- Sporting Goods Type Filter -->
${sportingTypeOptions}`],
    [`            'type-cellphones-option': { en: 'Cell Phones', es: 'Celulares' },
            'type-computers-option': { en: 'Computers', es: 'Computadoras' },
            'type-tvs-option': { en: 'TVs', es: 'Televisores' },
            'type-audio_video-option': { en: 'Audio & Video', es: 'Audio y Video' },
            'type-gaming-option': { en: 'Video Games', es: 'Videojuegos' },
            'type-cell_accessories-option': { en: 'Cell Accessories', es: 'Acc. Celulares' },
            'type-comp_accessories-option': { en: 'Comp. Accessories', es: 'Acc. Computo' },
            'type-other-option': { en: 'Other', es: 'Otros' }`, `            'type-bikes-option': { en: 'Bikes', es: 'Bicicletas' },
            'type-surf-option': { en: 'Surf & Water Sports', es: 'Surf y Deportes Acuáticos' },
            'type-fishing-option': { en: 'Fishing', es: 'Pesca' },
            'type-gym-option': { en: 'Gym & Fitness', es: 'Gimnasio y Fitness' },
            'type-camping-option': { en: 'Camping & Hiking', es: 'Camping y Senderismo' },
            'type-other-option': { en: 'Other', es: 'Otro' }`],
    ['// --- Electronics-specific filters ---', '// --- Sporting goods filters ---'],
    ['// --- Reset Electronics filters ---', '// --- Reset Sporting goods filters ---'],
    ['// *** Electronics-specific filter logic ***', '// *** Sporting goods filter logic ***'],
    ['// *** Electronics-specific filter listeners ***', '// *** Sporting goods filter listeners ***'],
    ['modalLoginBtn.href = `../../my-account.html?redirect=pages/for-sale/electronics.html`;', 'modalLoginBtn.href = `../../my-account.html?redirect=pages/for-sale/sportingGoods.html`;'],
    ['console.log("Firebase instances assigned for electronics.");', 'console.log("Firebase instances assigned for sporting goods.");'],
]);

// --- Cleaning & Moving (services) ---
writeFromTemplate(computerTemplate, path.join(ROOT, 'pages/Services/cleaningMoving.html'), [
    ['NunciaYa - Computer', 'NunciaYa - Cleaning & Moving'],
    ['=== UPDATED: Search and Filters (for Computer Services)', '=== Search and Filters (for Cleaning & Moving)'],
    ["const PAGE_SUB_CATEGORY = 'computer';", "const PAGE_SUB_CATEGORY = 'cleaningMoving';"],
    ["'search-input': { en: 'Search computer services...', es: 'Buscar servicios de computación...' },", "'search-input': { en: 'Search cleaning & moving...', es: 'Buscar limpieza y mudanzas...' },"],
    ['Computer', 'Cleaning & Moving'],
    ['Computación', 'Limpieza y Mudanzas'],
    ['modalLoginBtn.href = `../../my-account.html?redirect=pages/services/computer.html`;', 'modalLoginBtn.href = `../../my-account.html?redirect=pages/services/cleaningMoving.html`;'],
    ['console.log("Firebase instances assigned for computer services.");', 'console.log("Firebase instances assigned for cleaning & moving services.");'],
]);

console.log('\nDone.');
