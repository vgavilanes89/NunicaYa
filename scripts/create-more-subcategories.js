/**
 * Create new subcategory listing pages from templates.
 * Run: node scripts/create-more-subcategories.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const furnitureTpl = path.join(ROOT, 'pages/For Sale/furniture.html');
const electronicsTpl = path.join(ROOT, 'pages/For Sale/electronics.html');
const computerTpl = path.join(ROOT, 'pages/Services/computer.html');
const adminOfficeTpl = path.join(ROOT, 'pages/Jobs/adminOffice.html');

function replaceAll(content, pairs) {
    let out = content;
    for (const [from, to] of pairs) {
        if (!out.includes(from)) {
            console.warn('  WARN: pattern not found:', from.slice(0, 80));
        }
        out = out.split(from).join(to);
    }
    return out;
}

function write(dest, content) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, 'utf8');
    console.log('Created:', path.relative(ROOT, dest));
}

function fromFurniture({ file, titleEn, titleEs, subKey, searchEn, searchEs, redirect }) {
    let html = fs.readFileSync(furnitureTpl, 'utf8');
    html = replaceAll(html, [
        ['NunciaYa - Furniture', `NunciaYa - ${titleEn}`],
        ["const PAGE_SUB_CATEGORY = 'furniture';", `const PAGE_SUB_CATEGORY = '${subKey}';`],
        ["'search-input': { en: 'Search furniture...', es: 'Buscar muebles...' },", `'search-input': { en: '${searchEn}', es: '${searchEs}' },`],
        ['Furniture', titleEn],
        ['Muebles', titleEs],
        ['modalLoginBtn.href = `../../my-account.html?redirect=pages/for-sale/furniture.html`;', `modalLoginBtn.href = \`../../my-account.html?redirect=${redirect}\`;`],
        ['console.log("Firebase instances assigned for furniture.");', `console.log("Firebase instances assigned for ${subKey}.");`],
        ['DOM Content Loaded for furniture.html', `DOM Content Loaded for ${file}`],
    ]);
    write(path.join(ROOT, 'pages/For Sale', file), html);
}

function fromElectronicsClothes() {
    let html = fs.readFileSync(electronicsTpl, 'utf8');
    html = replaceAll(html, [
        ['NunciaYa - Electronics', 'NunciaYa - Clothes'],
        ['=== UPDATED: Search and Filters (for Electronics)', '=== Search and Filters (for Clothes)'],
        ["const PAGE_SUB_CATEGORY = 'electronics';", "const PAGE_SUB_CATEGORY = 'clothes';"],
        ["'search-input': { en: 'Search electronics...', es: 'Buscar electrónicos...' },", "'search-input': { en: 'Search clothes...', es: 'Buscar ropa...' },"],
        ['Electronics', 'Clothes'],
        ['Electrónicos', 'Ropa'],
        [`                    <option value="cellphones" id="type-cellphones-option"></option>
                    <option value="computers" id="type-computers-option"></option>
                    <option value="tvs" id="type-tvs-option"></option>
                    <option value="audio_video" id="type-audio_video-option"></option>
                    <option value="gaming" id="type-gaming-option"></option>
                    <option value="cell_accessories" id="type-cell_accessories-option"></option>
                    <option value="comp_accessories" id="type-comp_accessories-option"></option>
                    <option value="other" id="type-other-option"></option>`,
         `                    <option value="men" id="type-men-option"></option>
                    <option value="women" id="type-women-option"></option>
                    <option value="kids" id="type-kids-option"></option>
                    <option value="shoes" id="type-shoes-option"></option>
                    <option value="bags" id="type-bags-option"></option>
                    <option value="accessories" id="type-accessories-option"></option>
                    <option value="other" id="type-other-option"></option>`],
        [`            'type-cellphones-option': { en: 'Cell Phones', es: 'Celulares' },
            'type-computers-option': { en: 'Computers', es: 'Computadoras' },
            'type-tvs-option': { en: 'TVs', es: 'Televisores' },
            'type-audio_video-option': { en: 'Audio & Video', es: 'Audio y Video' },
            'type-gaming-option': { en: 'Video Games', es: 'Videojuegos' },
            'type-cell_accessories-option': { en: 'Cell Accessories', es: 'Acc. Celulares' },
            'type-comp_accessories-option': { en: 'Comp. Accessories', es: 'Acc. Computo' },
            'type-other-option': { en: 'Other', es: 'Otros' }`,
         `            'type-men-option': { en: "Men's", es: 'Hombre' },
            'type-women-option': { en: "Women's", es: 'Mujer' },
            'type-kids-option': { en: "Kids'", es: 'Niños' },
            'type-shoes-option': { en: 'Shoes', es: 'Zapatos' },
            'type-bags-option': { en: 'Bags', es: 'Bolsos' },
            'type-accessories-option': { en: 'Accessories', es: 'Accesorios' },
            'type-other-option': { en: 'Other', es: 'Otros' }`],
        ['modalLoginBtn.href = `../../my-account.html?redirect=pages/for-sale/electronics.html`;', 'modalLoginBtn.href = `../../my-account.html?redirect=pages/for-sale/clothes.html`;'],
        ['console.log("Firebase instances assigned for electronics.");', 'console.log("Firebase instances assigned for clothes.");'],
        ['DOM Content Loaded for electronics.html', 'DOM Content Loaded for clothes.html'],
        ['// --- Electronics-specific filters ---', '// --- Clothes-specific filters ---'],
        ['// --- Reset Electronics filters ---', '// --- Reset Clothes filters ---'],
        ['// *** Electronics-specific filter logic ***', '// *** Clothes-specific filter logic ***'],
        ['// *** Electronics-specific filter listeners ***', '// *** Clothes-specific filter listeners ***'],
    ]);
    write(path.join(ROOT, 'pages/For Sale/clothes.html'), html);
}

function fromComputer({ file, titleEn, titleEs, subKey, searchEn, searchEs, redirect, folder }) {
    let html = fs.readFileSync(computerTpl, 'utf8');
    html = replaceAll(html, [
        ['NunciaYa - Computer Services', `NunciaYa - ${titleEn}`],
        ["const PAGE_SUB_CATEGORY = 'computer';", `const PAGE_SUB_CATEGORY = '${subKey}';`],
        ["'search-input': { en: 'Search computer services...', es: 'Buscar servicios de computación...' },", `'search-input': { en: '${searchEn}', es: '${searchEs}' },`],
        ['Computer', titleEn],
        ['Computación', titleEs],
        ['modalLoginBtn.href = `../../my-account.html?redirect=pages/Services/computer.html`;', `modalLoginBtn.href = \`../../my-account.html?redirect=${redirect}\`;`],
        ['console.log("Firebase instances assigned for computer.");', `console.log("Firebase instances assigned for ${subKey}.");`],
        ['DOM Content Loaded for computer.html', `DOM Content Loaded for ${file}`],
    ]);
    // Breadcrumb "Services" stays; title replacements may over-replace "Computer" in unexpected places — OK for services pages
    write(path.join(ROOT, 'pages', folder, file), html);
}

function fromAdminOffice({ file, titleEn, titleEs, subKey, searchEn, searchEs, redirect }) {
    let html = fs.readFileSync(adminOfficeTpl, 'utf8');
    html = replaceAll(html, [
        ['NunciaYa - Admin / Office Jobs', `NunciaYa - ${titleEn}`],
        ["const PAGE_SUB_CATEGORY = 'adminOffice';", `const PAGE_SUB_CATEGORY = '${subKey}';`],
        ["'search-input': { en: 'Search admin / office jobs...', es: 'Buscar empleos admin / oficina...' },", `'search-input': { en: '${searchEn}', es: '${searchEs}' },`],
        ['Admin / Office', titleEn],
        ['Admin / Oficina', titleEs],
        ['modalLoginBtn.href = `../../my-account.html?redirect=pages/Jobs/adminOffice.html`;', `modalLoginBtn.href = \`../../my-account.html?redirect=${redirect}\`;`],
        ['console.log("Firebase instances assigned for adminOffice.");', `console.log("Firebase instances assigned for ${subKey}.");`],
        ['DOM Content Loaded for adminOffice.html', `DOM Content Loaded for ${file}`],
    ]);
    write(path.join(ROOT, 'pages/Jobs', file), html);
}

// --- For Sale ---
fromElectronicsClothes();

fromFurniture({
    file: 'booksMedia.html',
    titleEn: 'Books & Media',
    titleEs: 'Libros y Medios',
    subKey: 'booksMedia',
    searchEn: 'Search books & media...',
    searchEs: 'Buscar libros y medios...',
    redirect: 'pages/for-sale/booksMedia.html',
});

fromFurniture({
    file: 'babyKids.html',
    titleEn: 'Baby & Kids',
    titleEs: 'Bebés y Niños',
    subKey: 'babyKids',
    searchEn: 'Search baby & kids items...',
    searchEs: 'Buscar artículos para bebés y niños...',
    redirect: 'pages/for-sale/babyKids.html',
});

fromFurniture({
    file: 'toolsGarden.html',
    titleEn: 'Tools & Garden',
    titleEs: 'Herramientas y Jardín',
    subKey: 'toolsGarden',
    searchEn: 'Search tools & garden...',
    searchEs: 'Buscar herramientas y jardín...',
    redirect: 'pages/for-sale/toolsGarden.html',
});

fromFurniture({
    file: 'boats.html',
    titleEn: 'Boats & Marine',
    titleEs: 'Botes y Náutica',
    subKey: 'boats',
    searchEn: 'Search boats & marine...',
    searchEs: 'Buscar botes y náutica...',
    redirect: 'pages/for-sale/boats.html',
});

// --- Jobs ---
fromAdminOffice({
    file: 'education.html',
    titleEn: 'Education / Teaching',
    titleEs: 'Educación / Docencia',
    subKey: 'education',
    searchEn: 'Search education jobs...',
    searchEs: 'Buscar empleos de educación...',
    redirect: 'pages/Jobs/education.html',
});

fromAdminOffice({
    file: 'healthcare.html',
    titleEn: 'Healthcare / Medical',
    titleEs: 'Salud / Medicina',
    subKey: 'healthcare',
    searchEn: 'Search healthcare jobs...',
    searchEs: 'Buscar empleos de salud...',
    redirect: 'pages/Jobs/healthcare.html',
});

fromAdminOffice({
    file: 'construction.html',
    titleEn: 'Construction',
    titleEs: 'Construcción',
    subKey: 'construction',
    searchEn: 'Search construction jobs...',
    searchEs: 'Buscar empleos de construcción...',
    redirect: 'pages/Jobs/construction.html',
});

// --- Services ---
fromComputer({
    file: 'beauty.html',
    folder: 'Services',
    titleEn: 'Beauty & Personal Care',
    titleEs: 'Belleza y Cuidado Personal',
    subKey: 'beauty',
    searchEn: 'Search beauty services...',
    searchEs: 'Buscar servicios de belleza...',
    redirect: 'pages/Services/beauty.html',
});

fromComputer({
    file: 'petCare.html',
    folder: 'Services',
    titleEn: 'Pet Care',
    titleEs: 'Cuidado de Mascotas',
    subKey: 'petCare',
    searchEn: 'Search pet care services...',
    searchEs: 'Buscar cuidado de mascotas...',
    redirect: 'pages/Services/petCare.html',
});

fromComputer({
    file: 'photography.html',
    folder: 'Services',
    titleEn: 'Photography & Video',
    titleEs: 'Fotografía y Video',
    subKey: 'photography',
    searchEn: 'Search photography services...',
    searchEs: 'Buscar servicios de fotografía...',
    redirect: 'pages/Services/photography.html',
});

console.log('Done.');
