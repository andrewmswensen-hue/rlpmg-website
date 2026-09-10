/**
 * Validate the JSON-LD on every built page.
 *
 * This exists because structured data fails silently: a malformed graph costs
 * rich results and AI comprehension with no error anywhere. Runs over dist/.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const errors = [];
const warnings = [];
let pages = 0, nodes = 0;
let localBusinessPages = 0;

for (const f of await walk(DIST)) {
  const html = await readFile(f, 'utf8');
  const noindex = /name="robots"[^>]*noindex/.test(html);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];

  if (!blocks.length) {
    if (!noindex) errors.push(`${f}: no JSON-LD at all`);
    continue;
  }
  pages++;

  for (const [, raw] of blocks) {
    let data;
    try { data = JSON.parse(raw); }
    catch (e) { errors.push(`${f}: JSON-LD does not parse: ${e.message}`); continue; }

    const graph = data['@graph'] ?? [data];
    nodes += graph.length;
    const types = graph.map((n) => (Array.isArray(n['@type']) ? n['@type'] : [n['@type']]).join('/'));

    if (!data['@context']) errors.push(`${f}: missing @context`);
    for (const req of ['WebPage', 'WebSite']) {
      if (!types.some((t) => t.includes(req))) errors.push(`${f}: missing ${req} node`);
    }
    if (!types.some((t) => t.includes('Organization'))) errors.push(`${f}: missing Organization node`);

    // The rule that matters most on this site.
    const lb = graph.filter((n) => String(n['@type']).includes('LocalBusiness'));
    if (lb.length > 1) errors.push(`${f}: ${lb.length} LocalBusiness nodes, must be exactly 1`);
    if (lb.length === 1) {
      localBusinessPages++;
      const a = lb[0].address;
      if (!a?.streetAddress) errors.push(`${f}: LocalBusiness has no streetAddress`);
      if (a?.streetAddress && !a.streetAddress.includes('Cross Pointe')) {
        errors.push(`${f}: LocalBusiness address is not the Cross Pointe office: ${a.streetAddress}`);
      }
    }

    for (const n of graph) {
      if (!n['@type']) errors.push(`${f}: a node has no @type`);
      if (n['@type'] === 'FAQPage') {
        const q = n.mainEntity ?? [];
        if (!q.length) errors.push(`${f}: FAQPage with no questions`);
        for (const item of q) {
          if (!item.name) errors.push(`${f}: FAQ question missing name`);
          if (!item.acceptedAnswer?.text) errors.push(`${f}: FAQ "${item.name}" has no answer text`);
          if (item.acceptedAnswer?.text && item.acceptedAnswer.text.length < 40) {
            warnings.push(`${f}: FAQ answer under 40 chars: "${item.name}"`);
          }
        }
      }
      if (n['@type'] === 'BreadcrumbList') {
        const items = n.itemListElement ?? [];
        items.forEach((it, i) => {
          if (it.position !== i + 1) errors.push(`${f}: breadcrumb position out of order`);
        });
      }
    }
  }
}

console.log(`schema: ${pages} pages, ${nodes} nodes, ${localBusinessPages} carrying LocalBusiness`);
for (const w of warnings.slice(0, 15)) console.log(`  warn  ${w}`);
if (warnings.length > 15) console.log(`  ...and ${warnings.length - 15} more warnings`);
if (errors.length) {
  console.error(`\n${errors.length} SCHEMA ERRORS:`);
  for (const e of errors.slice(0, 40)) console.error(`  ${e}`);
  if (errors.length > 40) console.error(`  ...and ${errors.length - 40} more`);
  process.exit(1);
}
console.log('schema: 0 errors');
