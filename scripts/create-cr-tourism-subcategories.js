/**
 * Costa Rica tourism / nature subcategory pages.
 * Run: node scripts/create-cr-tourism-subcategories.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const vacationTpl = path.join(ROOT, 'pages/housing/vacationRentals.html');
const furnitureTpl = path.join(ROOT, 'pages/For Sale/furniture.html');
const computerTpl = path.join(ROOT, 'pages/Services/computer.html');
const adminOfficeTpl = path.join(ROOT, 'pages/Jobs/adminOffice.html');
const activitiesTpl = path.join(ROOT, 'pages/Community/activities.html');

function replaceAll(content, pairs) {
    let out = content;
    for (const [from, to] of pairs) {
        if (!out.includes(from)) {
            console.warn('  WARN: pattern not found:', from.slice(0, 90));
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

function fromVacation({ file, titleEn, titleEs, subKey, searchEn, searchEs }) {
    let html = fs.readFileSync(vacationTpl, 'utf8');
    html = replaceAll(html, [
        ['NunciaYa - Vacation Rentals', `NunciaYa - ${titleEn}`],
        ["const PAGE_SUB_CATEGORY = 'vacationrentals';", `const PAGE_SUB_CATEGORY = '${subKey}';`],
        ["'search-input': { en: 'Search vacation rentals...', es: 'Buscar alquileres vacacionales...' },", `'search-input': { en: '${searchEn}', es: '${searchEs}' },`],
        ['Vacation Rentals', titleEn],
        ['Alquileres de Vacaciones', titleEs],
        ['modalLoginBtn.href = `../../my-account.html?redirect=pages/housing/vacationRentals.html`;', `modalLoginBtn.href = \`../../my-account.html?redirect=pages/housing/${file}\`;`],
        ['console.log("Firebase instances assigned for vacationRentals.");', `console.log("Firebase instances assigned for ${subKey}.");`],
        ['DOM Content Loaded for vacationRentals.html (Algolia Version)', `DOM Content Loaded for ${file}`],
    ]);
    write(path.join(ROOT, 'pages/housing', file), html);
}

function fromFurniture({ file, titleEn, titleEs, subKey, searchEn, searchEs }) {
    let html = fs.readFileSync(furnitureTpl, 'utf8');
    html = replaceAll(html, [
        ['NunciaYa - Furniture', `NunciaYa - ${titleEn}`],
        ["const PAGE_SUB_CATEGORY = 'furniture';", `const PAGE_SUB_CATEGORY = '${subKey}';`],
        ["'search-input': { en: 'Search furniture...', es: 'Buscar muebles...' },", `'search-input': { en: '${searchEn}', es: '${searchEs}' },`],
        ['Furniture', titleEn],
        ['Muebles', titleEs],
        ['modalLoginBtn.href = `../../my-account.html?redirect=pages/for-sale/furniture.html`;', `modalLoginBtn.href = \`../../my-account.html?redirect=pages/for-sale/${file}\`;`],
        ['console.log("Firebase instances assigned for furniture.");', `console.log("Firebase instances assigned for ${subKey}.");`],
        ['DOM Content Loaded for furniture.html (Algolia Version)', `DOM Content Loaded for ${file}`],
    ]);
    write(path.join(ROOT, 'pages/For Sale', file), html);
}

function fromComputer({ file, titleEn, titleEs, subKey, searchEn, searchEs }) {
    let html = fs.readFileSync(computerTpl, 'utf8');
    html = replaceAll(html, [
        ['NunciaYa - Computer Services', `NunciaYa - ${titleEn}`],
        ["const PAGE_SUB_CATEGORY = 'computer';", `const PAGE_SUB_CATEGORY = '${subKey}';`],
        ["'search-input': { en: 'Search computer services...', es: 'Buscar servicios de computación...' },", `'search-input': { en: '${searchEn}', es: '${searchEs}' },`],
        ['Computer', titleEn],
        ['Computación', titleEs],
        ['modalLoginBtn.href = `../../my-account.html?redirect=pages/services/computer.html`;', `modalLoginBtn.href = \`../../my-account.html?redirect=pages/Services/${file}\`;`],
        ['console.log("Firebase instances assigned for computer.");', `console.log("Firebase instances assigned for ${subKey}.");`],
        ['DOM Content Loaded for computer.html (Algolia Version)', `DOM Content Loaded for ${file}`],
    ]);
    write(path.join(ROOT, 'pages/Services', file), html);
}

function fromAdminOffice({ file, titleEn, titleEs, subKey, searchEn, searchEs }) {
    let html = fs.readFileSync(adminOfficeTpl, 'utf8');
    html = replaceAll(html, [
        ['NunciaYa - Admin / Office Jobs', `NunciaYa - ${titleEn}`],
        ["const PAGE_SUB_CATEGORY = 'adminoffice';", `const PAGE_SUB_CATEGORY = '${subKey}';`],
        ["'search-input': { en: 'Search admin / office jobs...', es: 'Buscar empleos admin / oficina...' },", `'search-input': { en: '${searchEn}', es: '${searchEs}' },`],
        ['Admin / Office', titleEn],
        ['Admin / Oficina', titleEs],
        ['modalLoginBtn.href = `../../my-account.html?redirect=pages/jobs/adminOffice.html`;', `modalLoginBtn.href = \`../../my-account.html?redirect=pages/Jobs/${file}\`;`],
        ['console.log("Firebase instances assigned for adminOffice.");', `console.log("Firebase instances assigned for ${subKey}.");`],
        ['DOM Content Loaded for adminOffice.html (Algolia Version)', `DOM Content Loaded for ${file}`],
    ]);
    write(path.join(ROOT, 'pages/Jobs', file), html);
}

function fromActivities({ file, titleEn, titleEs, subKey, searchEn, searchEs }) {
    let html = fs.readFileSync(activitiesTpl, 'utf8');
    html = replaceAll(html, [
        ['NunciaYa - Activities', `NunciaYa - ${titleEn}`],
        ["const PAGE_SUB_CATEGORY = 'activities';", `const PAGE_SUB_CATEGORY = '${subKey}';`],
        ["'search-input': { en: 'Search activities...', es: 'Buscar actividades...' },", `'search-input': { en: '${searchEn}', es: '${searchEs}' },`],
        ['Activities', titleEn],
        ['Actividades', titleEs],
        ['modalLoginBtn.href = `../../my-account.html?redirect=pages/community/activities.html`;', `modalLoginBtn.href = \`../../my-account.html?redirect=pages/Community/${file}\`;`],
        ['console.log("Firebase instances assigned for activities.");', `console.log("Firebase instances assigned for ${subKey}.");`],
        ['DOM Content Loaded for activities.html (Algolia Version)', `DOM Content Loaded for ${file}`],
    ]);
    write(path.join(ROOT, 'pages/Community', file), html);
}

// --- Housing ---
fromVacation({
    file: 'cabins.html',
    titleEn: 'Cabins / Cabinas',
    titleEs: 'Cabinas',
    subKey: 'cabins',
    searchEn: 'Search cabins...',
    searchEs: 'Buscar cabinas...',
});

fromVacation({
    file: 'landFarms.html',
    titleEn: 'Land & Farms',
    titleEs: 'Fincas y Terrenos',
    subKey: 'landFarms',
    searchEn: 'Search land & farms...',
    searchEs: 'Buscar fincas y terrenos...',
});

// --- For Sale ---
fromFurniture({
    file: 'farmProduce.html',
    titleEn: 'Farm & Produce',
    titleEs: 'Productos de Finca',
    subKey: 'farmProduce',
    searchEn: 'Search farm & produce...',
    searchEs: 'Buscar productos de finca...',
});

// --- Jobs ---
fromAdminOffice({
    file: 'agriculture.html',
    titleEn: 'Agriculture / Farming',
    titleEs: 'Agricultura',
    subKey: 'agriculture',
    searchEn: 'Search agriculture jobs...',
    searchEs: 'Buscar empleos de agricultura...',
});

// --- Services ---
fromComputer({
    file: 'toursGuides.html',
    titleEn: 'Tours & Guides',
    titleEs: 'Tours y Guías',
    subKey: 'toursGuides',
    searchEn: 'Search tours & guides...',
    searchEs: 'Buscar tours y guías...',
});

fromComputer({
    file: 'transportTransfers.html',
    titleEn: 'Transport & Transfers',
    titleEs: 'Transporte y Traslados',
    subKey: 'transportTransfers',
    searchEn: 'Search transport & transfers...',
    searchEs: 'Buscar transporte y traslados...',
});

fromComputer({
    file: 'propertyCare.html',
    titleEn: 'Vacation Property Care',
    titleEs: 'Cuidado de Propiedades',
    subKey: 'propertyCare',
    searchEn: 'Search vacation property care...',
    searchEs: 'Buscar cuidado de propiedades...',
});

// --- Community ---
fromActivities({
    file: 'conservation.html',
    titleEn: 'Conservation & Eco',
    titleEs: 'Conservación y Eco',
    subKey: 'conservation',
    searchEn: 'Search conservation & eco...',
    searchEs: 'Buscar conservación y eco...',
});

console.log('Done.');
