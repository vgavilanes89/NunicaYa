/**
 * Algolia index settings and derived search fields for listings.
 *
 * Listings are priced in colones or dollars. To sort and range-filter across both, every
 * Algolia record gets `priceUsd` (the price converted to USD at CRC_PER_USD) and, for vehicles,
 * a numeric `yearNumber`. Sorting is done by Algolia replicas, one per sort order, so it covers
 * every result rather than just the first page.
 *
 * Keep CRC_PER_USD in sync with config.js (app.crcPerUsd), which converts the price filter
 * the user types in colones.
 */

const CRC_PER_USD = Number(process.env.CRC_PER_USD) || 505;

// Facets used by category search pages (vehicle + condition + status filters).
const ALGOLIA_FACET_ATTRIBUTES = [
  "baths",
  "canton",
  "category",
  "district",
  "expiresAtSeconds",
  "rooms",
  "subCategory",
  "zone",
  "filterOnly(year)",
  "filterOnly(make)",
  "filterOnly(model)",
  "filterOnly(trim)",
  "filterOnly(condition)",
  "filterOnly(status)",
  "filterOnly(type)",
];

const NUMERIC_ATTRIBUTES = [
  "expiresAtSeconds",
  "publicVisibleUntilSeconds",
  "createdAtSeconds",
  "priceUsd",
  "yearNumber",
];

// Default Algolia ranking criteria, used after the sort attribute on each replica.
const DEFAULT_RANKING = ["typo", "geo", "words", "filters", "proximity", "attribute", "exact", "custom"];

/** Sort id (as used by js/listing-sort.js) → replica suffix and its leading ranking criterion. */
const SORT_REPLICAS = {
  newest: { suffix: "_newest", criterion: "desc(createdAtSeconds)" },
  oldest: { suffix: "_oldest", criterion: "asc(createdAtSeconds)" },
  price_asc: { suffix: "_price_asc", criterion: "asc(priceUsd)" },
  price_desc: { suffix: "_price_desc", criterion: "desc(priceUsd)" },
};

function replicaName(indexName, sortId) {
  return indexName + SORT_REPLICAS[sortId].suffix;
}

/**
 * Numeric fields derived from a listing (Firestore doc or Algolia record). Fields that can't be
 * derived are returned as null so a partial update clears stale values.
 */
function derivedSearchFields(data) {
  const out = { priceUsd: null, yearNumber: null };
  const amount = Number(data.priceAmount);
  if (data.priceAmount != null && data.priceAmount !== "" && Number.isFinite(amount) && amount >= 0) {
    const usd = data.currency === "usd" ? amount : amount / CRC_PER_USD;
    out.priceUsd = Math.round(usd * 100) / 100;
  }
  const year = parseInt(String(data.year == null ? "" : data.year).trim(), 10);
  if (Number.isInteger(year) && year >= 1900 && year <= 2100) {
    out.yearNumber = year;
  }
  return out;
}

/**
 * Applies facets, numeric filters and the sort replicas. Safe to run repeatedly.
 * `client` is an algoliasearch client created with the admin key.
 */
async function configureAlgoliaIndexSettings(client, indexName) {
  const primary = client.initIndex(indexName);
  const replicas = Object.keys(SORT_REPLICAS).map((id) => replicaName(indexName, id));

  // Creating replicas copies the primary's settings into them.
  await primary.setSettings({ replicas }).wait();
  await primary.setSettings({
    attributesForFaceting: ALGOLIA_FACET_ATTRIBUTES,
    numericAttributesForFiltering: NUMERIC_ATTRIBUTES,
  }, { forwardToReplicas: true }).wait();

  for (const id of Object.keys(SORT_REPLICAS)) {
    await client.initIndex(replicaName(indexName, id)).setSettings({
      ranking: [SORT_REPLICAS[id].criterion, ...DEFAULT_RANKING],
    }).wait();
  }
  console.log(`Algolia settings applied to ${indexName} and replicas: ${replicas.join(", ")}`);
  return replicas;
}

module.exports = {
  CRC_PER_USD,
  SORT_REPLICAS,
  replicaName,
  derivedSearchFields,
  configureAlgoliaIndexSettings,
};
