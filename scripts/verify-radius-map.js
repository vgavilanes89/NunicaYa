const fs = require('fs');
const path = require('path');

function walk(d, o = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, o);
    else if (p.endsWith('.html')) o.push(p);
  }
  return o;
}

const all = walk('pages').filter((p) => fs.readFileSync(p, 'utf8').includes('id="filter-zone"'));
all.push('listing-search.html');
const missing = [];
for (const f of all) {
  const c = fs.readFileSync(f, 'utf8');
  if (!c.includes('radius-map-section')) missing.push(`${f}: html`);
  if (!c.includes('listing-radius-filter.js')) missing.push(`${f}: script`);
  if (!c.includes('NunciaYaListingRadiusFilter')) missing.push(`${f}: hook`);
}
console.log(missing.length ? missing.join('\n') : `All ${all.length} pages OK`);
