/**
 * Builds data/vehicles-cr.json: vehicle makes and models for the Costa Rican market,
 * used by js/vehicle-filters.js on post-ad and the vehicle category pages.
 *
 * Sources:
 *   - scripts/vehicle-catalog/cr-brands.js: brands sold in Costa Rica and curated CR lineups.
 *   - FIPE (Brazil's vehicle price table) via https://fipe.parallelum.com.br/api/v2 for
 *     brands that aren't fully curated (adds older and long-tail models).
 *
 * Run from the repo root:  node scripts/build-vehicle-catalog.js
 * FIPE responses are cached in the OS temp folder (the free API allows ~500 requests/day);
 * pass --refresh to refetch them.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { CAR_BRANDS, MOTO_BRANDS } = require('./vehicle-catalog/cr-brands');

const FIPE_BASE = 'https://fipe.parallelum.com.br/api/v2';
const CACHE_DIR = path.join(os.tmpdir(), 'nunciaya-fipe-cache');
const OUT_FILE = path.join(__dirname, '..', 'data', 'vehicles-cr.json');
const REFRESH = process.argv.includes('--refresh');

// Words that continue a model name rather than start a trim ("Land Cruiser", "Santa Fe").
const CONTINUATIONS = new Set(['cruiser', 'fe', 'vitara', 'cherokee', 'rover', 'cross', 'plus', 'pro',
  'aircross', 'max', 'space', 'trail', 'sport']);
// FIPE body/chassis words that aren't model names.
const NOT_MODELS = new Set(['chassi', 'furgao', 'furgão', 'cabine', 'onibus', 'ônibus', 'pick-up', 'picape',
  'caminhao', 'caminhão', 'trator', 'reboque', 'triciclo', 'quadriciclo']);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'nunciaya-catalog-builder' } }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`${res.statusCode} ${url}: ${body.slice(0, 120)}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function cachedFetch(key, url) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, key.replace(/[^a-z0-9_-]/gi, '_') + '.json');
  if (!REFRESH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const data = await fetchJson(url);
  fs.writeFileSync(file, JSON.stringify(data));
  await new Promise((r) => setTimeout(r, 250)); // be gentle with the free API
  return data;
}

/** "DOMINAR" → "Dominar"; keeps "CB", "RAV4", "CR-V", "i30". */
function tidyWord(w) {
  if (/^[A-ZÀ-Ý]{4,}$/.test(w)) return w.charAt(0) + w.slice(1).toLowerCase();
  return w;
}

/** FIPE version name → base model name, or null when it isn't usable. */
function baseModel(fipeName, kind) {
  if (fipeName.indexOf('/') !== -1) return null; // "Deville/Eldorado", "Classic/Classic 500"
  const tokens = fipeName.trim().split(/\s+/);
  const first = tokens[0].replace(/[.,/]+$/, '');
  if (!first || first.length < 2 || /[.]/.test(first) || /^\d+(\.\d+)?$/.test(first) && kind === 'car' && first.length < 3) return null;
  if (NOT_MODELS.has(first.toLowerCase())) return null;
  const parts = [tidyWord(first)];
  const next = (tokens[1] || '').replace(/[.,/]+$/, '');
  if (kind === 'car' && next && CONTINUATIONS.has(next.toLowerCase())) parts.push(tidyWord(next));
  if (kind === 'moto' && next && /^[A-Z]{0,3}\d{2,4}[A-Z]{0,3}$/i.test(next)) {
    parts.push(next.toUpperCase().replace(/^(\d{2,4})CC$/, '$1')); // "600CC" → "600"
  }
  return parts.join(' ');
}

async function fipeModelsFor(type, fipeBrandNames, brandIndex, kind) {
  const names = new Set();
  for (const wanted of fipeBrandNames) {
    for (const t of type) {
      const brand = (brandIndex[t] || []).find((b) => b.name.toLowerCase() === wanted.toLowerCase());
      if (!brand) continue;
      const models = await cachedFetch(`${t}-${brand.code}`, `${FIPE_BASE}/${t}/brands/${brand.code}/models`);
      models.forEach((m) => {
        const base = baseModel(m.name, kind);
        if (base) names.add(base);
      });
    }
  }
  return names;
}

function uniqueSorted(list) {
  const seen = new Map();
  list.forEach((m) => {
    const key = m.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key && !seen.has(key)) seen.set(key, m);
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' }));
}

async function buildCatalog(brands, fipeTypes, kind, brandIndex) {
  const out = {};
  const stats = { curated: 0, merged: 0, fipeAdded: 0 };
  for (const make of Object.keys(brands).sort((a, b) => a.localeCompare(b, 'es'))) {
    const def = brands[make];
    let models = [...(def.models || [])];
    if (!def.curated && def.fipe && def.fipe.length) {
      const fipe = await fipeModelsFor(fipeTypes, def.fipe, brandIndex, kind);
      const exclude = new Set((def.exclude || []).map((x) => x.toLowerCase()));
      const before = uniqueSorted(models).length;
      models = models.concat([...fipe].filter((m) => !exclude.has(m.toLowerCase())));
      stats.fipeAdded += uniqueSorted(models).length - before;
      stats.merged += 1;
    } else {
      stats.curated += 1;
    }
    out[make] = uniqueSorted(models);
  }
  return { catalog: out, stats };
}

async function main() {
  const brandIndex = {};
  for (const t of ['cars', 'trucks', 'motorcycles']) {
    brandIndex[t] = await cachedFetch(`${t}-brands`, `${FIPE_BASE}/${t}/brands`);
  }
  const car = await buildCatalog(CAR_BRANDS, ['cars', 'trucks'], 'car', brandIndex);
  const moto = await buildCatalog(MOTO_BRANDS, ['motorcycles'], 'moto', brandIndex);

  const data = {
    version: 1,
    generated: new Date().toISOString().slice(0, 10),
    source: 'Costa Rica lineups (scripts/vehicle-catalog/cr-brands.js) + FIPE via fipe.parallelum.com.br',
    car: car.catalog,
    motorcycle: moto.catalog,
  };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(data) + '\n');

  const count = (c) => Object.values(c).reduce((n, m) => n + m.length, 0);
  console.log(`Cars: ${Object.keys(car.catalog).length} makes, ${count(car.catalog)} models ` +
    `(${car.stats.curated} curated, ${car.stats.merged} merged with FIPE, +${car.stats.fipeAdded} from FIPE)`);
  console.log(`Motorcycles: ${Object.keys(moto.catalog).length} makes, ${count(moto.catalog)} models ` +
    `(${moto.stats.curated} curated, ${moto.stats.merged} merged with FIPE, +${moto.stats.fipeAdded} from FIPE)`);
  console.log(`Wrote ${path.relative(process.cwd(), OUT_FILE)} (${fs.statSync(OUT_FILE).size} bytes)`);
}

main().catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
