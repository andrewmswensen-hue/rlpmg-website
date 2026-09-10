/**
 * Find internal links that point at pages which do not exist.
 *
 * Pages were built in parallel by several agents, each linking to paths from the
 * information architecture doc rather than to files it could see. That is the
 * right way to write them, but it means broken links are likely until everything
 * lands. This catches them before they reach the preview.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
async function walk(dir, all = false) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p, all));
    else if (all || e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = await walk(DIST);
/**
 * Every emitted file counts as a valid target, not just HTML. Fonts, the CSS
 * bundle, the favicon, the JSON endpoints and the Markdown twins are all real
 * URLs that pages legitimately link to.
 */
const everything = await walk(DIST, true);
const pages = new Set();
for (const f of everything) {
  const url = '/' + f.replace(/^dist\//, '');
  pages.add(url);
  if (url.endsWith('/index.html')) pages.add(url.replace(/index\.html$/, ''));
}
pages.add('/');

const broken = new Map();
let checked = 0;

for (const f of files) {
  const html = await readFile(f, 'utf8');
  const from = '/' + f.replace(/^dist\//, '').replace(/index\.html$/, '');
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    let href = m[1];
    if (/^(https?:|mailto:|tel:|#|data:|\/\/)/.test(href)) continue;
    href = href.split('#')[0].split('?')[0];
    if (!href.startsWith('/')) continue;
    checked++;
    if (pages.has(href)) continue;
    if (pages.has(href + '/')) continue;
    if (!broken.has(href)) broken.set(href, new Set());
    broken.get(href).add(from);
  }
}

console.log(`links: ${checked} internal links checked across ${files.length} pages`);
if (!broken.size) { console.log('links: no broken internal links'); process.exit(0); }

const sorted = [...broken.entries()].sort((a, b) => b[1].size - a[1].size);
console.error(`\n${sorted.length} BROKEN INTERNAL LINK TARGETS:\n`);
for (const [href, from] of sorted) {
  const list = [...from].slice(0, 4);
  console.error(`  ${href}`);
  console.error(`    linked from ${from.size} page${from.size === 1 ? '' : 's'}: ${list.join(', ')}${from.size > 4 ? ', ...' : ''}`);
}
process.exit(1);
