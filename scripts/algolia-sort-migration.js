/**
 * One-off Algolia migration for range filters and server-side sorting.
 *
 * 1. Applies index settings: numeric filters on priceUsd / yearNumber and the sort replicas
 *    (listings_newest, listings_oldest, listings_price_asc, listings_price_desc).
 * 2. Adds priceUsd / yearNumber to records already in the index (new and edited listings get
 *    them from the Cloud Functions sync).
 *
 * Run from the repo root (reads the admin key from functions/.env.nunciaya-web):
 *   node scripts/algolia-sort-migration.js
 * Run it before deploying the category pages that search the replicas. Safe to re-run.
 */
const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, '..', 'functions');
const algoliasearch = require(path.join(functionsDir, 'node_modules', 'algoliasearch'));

function readEnv(file) {
  const env = {};
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  });
  return env;
}

async function main() {
  const env = readEnv(path.join(functionsDir, '.env.nunciaya-web'));
  if (env.CRC_PER_USD) process.env.CRC_PER_USD = env.CRC_PER_USD;
  const { configureAlgoliaIndexSettings, derivedSearchFields, CRC_PER_USD } =
    require(path.join(functionsDir, 'algolia-config.js'));
  if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_API_KEY) {
    throw new Error('ALGOLIA_APP_ID / ALGOLIA_API_KEY missing from functions/.env.nunciaya-web');
  }

  const client = algoliasearch(env.ALGOLIA_APP_ID, env.ALGOLIA_API_KEY);
  const replicas = await configureAlgoliaIndexSettings(client, 'listings');
  console.log('Settings applied. Replicas:', replicas.join(', '));

  const index = client.initIndex('listings');
  const updates = [];
  await index.browseObjects({
    attributesToRetrieve: ['priceAmount', 'currency', 'year', 'priceUsd', 'yearNumber'],
    batch: (hits) => {
      hits.forEach((hit) => {
        const derived = derivedSearchFields(hit);
        if (derived.priceUsd !== (hit.priceUsd ?? null) || derived.yearNumber !== (hit.yearNumber ?? null)) {
          updates.push({ objectID: hit.objectID, ...derived });
        }
      });
    },
  });

  if (updates.length) {
    await index.partialUpdateObjects(updates).wait();
  }
  console.log(`Records updated: ${updates.length} (rate ${CRC_PER_USD} CRC/USD)`);
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
