/**
 * Adds Spanish SEO tags to every public HTML page and writes sitemap.xml.
 *
 *   - <html lang="es">, a Spanish <title> and meta description
 *   - canonical link and Open Graph / Twitter tags (WhatsApp/Facebook link previews)
 *   - noindex on private pages (account, post-ad, admin, profile) and search results
 *
 * Category pages take their Spanish name from the breadcrumb. The block between
 * <!-- seo:start --> and <!-- seo:end --> is regenerated on every run, so edit this script
 * (not the pages) and rerun:  node scripts/seo-head.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://nunciaya.com';

const PRIVATE = new Set(['admin.html', 'my-account.html', 'post-ad.html', 'profile.html', 'offline.html']);

const STATIC_PAGES = {
  'index.html': {
    url: '/',
    title: 'NunciaYa | Clasificados en Costa Rica: venta, vivienda, empleos y servicios',
    description: 'Compre, venda y encuentre vivienda, empleos y servicios en Costa Rica. Anuncios clasificados por provincia, cantón y distrito en NunciaYa.',
  },
  'listing-search.html': {
    title: 'Buscar anuncios en Costa Rica | NunciaYa',
    description: 'Busque anuncios clasificados en todo Costa Rica: artículos en venta, vivienda, empleos y servicios en NunciaYa.',
    noindex: true, // results change with every query
  },
  'pages/about.html': {
    title: 'Acerca de NunciaYa | Clasificados de Costa Rica',
    description: 'NunciaYa es el sitio de anuncios clasificados de Costa Rica para comprar, vender, alquilar, encontrar empleo y servicios cerca de usted.',
  },
  'pages/contact-help.html': {
    title: 'Ayuda y contacto | NunciaYa',
    description: 'Preguntas frecuentes y contacto con el equipo de NunciaYa: cómo publicar anuncios, pagos, cuentas y soporte.',
  },
  'pages/privacy.html': {
    title: 'Política de privacidad | NunciaYa',
    description: 'Cómo NunciaYa recopila, usa y protege sus datos personales, y cómo ejercer sus derechos sobre su información.',
  },
  'pages/safety.html': {
    title: 'Consejos de seguridad para comprar y vender | NunciaYa',
    description: 'Consejos para comprar y vender de forma segura en Costa Rica y evitar estafas en anuncios clasificados.',
  },
  'pages/terms.html': {
    title: 'Términos y condiciones | NunciaYa',
    description: 'Términos y condiciones de uso de NunciaYa, el sitio de anuncios clasificados de Costa Rica.',
  },
  'pages/listing/detail.html': {
    // The ad page sets its own title, description and canonical from the ad (see detail.html)
    title: 'Anuncio | NunciaYa',
    description: 'Detalles del anuncio en NunciaYa, clasificados de Costa Rica.',
    noCanonical: true,
  },
};

const PRIVATE_TITLES = {
  'admin.html': 'Panel de administración | NunciaYa',
  'my-account.html': 'Mi cuenta | NunciaYa',
  'post-ad.html': 'Publicar anuncio | NunciaYa',
  'profile.html': 'Mi perfil | NunciaYa',
  'offline.html': 'Sin conexión | NunciaYa',
};

// Description templates per section (breadcrumb parent, Spanish)
function categoryDescription(section, name) {
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  switch (section) {
    case 'Vivienda':
      return `${name} en Costa Rica: encuentre o publique anuncios de vivienda por provincia, cantón y distrito en NunciaYa.`;
    case 'En Venta':
      return `${name} en venta en Costa Rica: compre y venda artículos nuevos y usados cerca de usted con anuncios clasificados en NunciaYa.`;
    case 'Empleo':
    case 'Empleos':
      return `Empleos de ${lower} en Costa Rica: ofertas de trabajo por provincia y cantón en NunciaYa, clasificados de Costa Rica.`;
    case 'Servicios':
      return `Servicios de ${lower} en Costa Rica: encuentre profesionales cerca de usted o anuncie su servicio en NunciaYa.`;
    case 'Comunidad':
      return `${name} en Costa Rica: anuncios de la comunidad por provincia y cantón en NunciaYa.`;
    case 'Personales':
      return `${name}: anuncios personales en Costa Rica en NunciaYa.`;
    default:
      return `${name} en Costa Rica: anuncios clasificados en NunciaYa.`;
  }
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pageUrl(rel) {
  return '/' + rel.split('/').map(encodeURIComponent).join('/');
}

/** Spanish breadcrumb texts, e.g. ["Todo CR", "En Venta", "Carros y Camiones"]. */
function breadcrumbEs(html) {
  const nav = html.match(/<nav class="text-sm mb-2">([\s\S]*?)<\/nav>/);
  if (!nav) return [];
  return [...nav[1].matchAll(/<span class="lang-es">([^<]+)<\/span>/g)].map((m) => m[1].trim());
}

function listPages() {
  const out = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      if (fs.statSync(full).isDirectory()) {
        if (['node_modules', 'functions', 'scripts', '.git', 'data', 'js'].includes(name)) continue;
        walk(full);
      } else if (name.endsWith('.html') && !name.startsWith('_')) {
        out.push(rel);
      }
    }
  })(ROOT);
  return out.sort();
}

function buildHead(rel, html) {
  if (PRIVATE.has(rel)) {
    return { title: PRIVATE_TITLES[rel], tags: ['<meta name="robots" content="noindex">'], indexable: false };
  }
  let meta = STATIC_PAGES[rel];
  if (!meta && rel.startsWith('pages/')) {
    const crumbs = breadcrumbEs(html);
    if (crumbs.length >= 3) {
      const name = crumbs[crumbs.length - 1];
      const section = crumbs[crumbs.length - 2];
      meta = { title: `${name} en Costa Rica | NunciaYa`, description: categoryDescription(section, name) };
    }
  }
  if (!meta) throw new Error(`No SEO data for ${rel}`);

  const url = SITE + (meta.url || pageUrl(rel));
  const tags = [`<meta name="description" content="${escapeAttr(meta.description)}">`];
  if (meta.noindex) tags.push('<meta name="robots" content="noindex, follow">');
  if (!meta.noCanonical) tags.push(`<link rel="canonical" href="${escapeAttr(url)}">`);
  tags.push(
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="NunciaYa">',
    '<meta property="og:locale" content="es_CR">',
    `<meta property="og:title" content="${escapeAttr(meta.title)}">`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}">`,
  );
  if (!meta.noCanonical) tags.push(`<meta property="og:url" content="${escapeAttr(url)}">`);
  tags.push('<meta name="twitter:card" content="summary">');
  return { title: meta.title, tags, indexable: !meta.noindex && !meta.noCanonical, url };
}

function main() {
  const sitemapUrls = [];
  let changed = 0;
  for (const rel of listPages()) {
    const file = path.join(ROOT, rel);
    let html = fs.readFileSync(file, 'utf8');
    const before = html;
    const head = buildHead(rel, html);

    html = html.replace(/<html lang="[a-z]{2}">/, '<html lang="es">');
    html = html.replace(/\n?[ \t]*<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, '');
    const block = ['<!-- seo:start -->', ...head.tags, '<!-- seo:end -->'].map((l) => '    ' + l).join('\n');
    if (!/<title>[\s\S]*?<\/title>/.test(html)) throw new Error(`No <title> in ${rel}`);
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(head.title)}</title>\n${block}`);

    if (html !== before) {
      fs.writeFileSync(file, html);
      changed += 1;
    }
    if (head.indexable) sitemapUrls.push(head.url);
  }

  const today = new Date().toISOString().slice(0, 10);
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + sitemapUrls.map((u) => `  <url><loc>${escapeAttr(u)}</loc><lastmod>${today}</lastmod></url>`).join('\n')
    + '\n</urlset>\n';
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log(`Updated ${changed} pages; sitemap.xml has ${sitemapUrls.length} URLs.`);
}

main();
