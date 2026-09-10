/**
 * Audit titles, meta descriptions and heading structure across the built site.
 *
 * Google truncates a title around 60 characters and a description around 155 to
 * 160. Over that is not an error, but it means the tail is invisible in the
 * result, which wastes the part most likely to earn the click.
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

const TITLE_MAX = 60, DESC_MAX = 160, DESC_MIN = 70;
const rows = [];
let noindex = 0, scripts = 0;

for (const f of await walk(DIST)) {
  const h = await readFile(f, 'utf8');
  if (/name="robots"[^>]*noindex/.test(h)) { noindex++; continue; }
  const url = '/' + f.replace(/^dist\//, '').replace(/index\.html$/, '');
  const title = (h.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
  const desc = (h.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? '').trim();
  const h1s = [...h.matchAll(/<h1[^>]*>/g)].length;
  const canon = h.match(/<link rel="canonical" href="([^"]*)"/i)?.[1] ?? '';
  // any script that is not JSON-LD
  const js = [...h.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>/g)].length;
  scripts += js;
  rows.push({ url, title, desc, h1s, canon, js });
}

const longT = rows.filter((r) => r.title.length > TITLE_MAX);
const longD = rows.filter((r) => r.desc.length > DESC_MAX);
const shortD = rows.filter((r) => r.desc.length && r.desc.length < DESC_MIN);
const noD = rows.filter((r) => !r.desc);
const badH1 = rows.filter((r) => r.h1s !== 1);
const noCanon = rows.filter((r) => !r.canon);
const withJs = rows.filter((r) => r.js > 0);

// duplicate titles and descriptions are a real ranking problem
const dup = (key) => {
  const m = new Map();
  for (const r of rows) { const v = r[key]; if (!v) continue; (m.get(v) ?? m.set(v, []).get(v)).push(r.url); }
  return [...m.entries()].filter(([, u]) => u.length > 1);
};

console.log(`meta: ${rows.length} indexable pages checked (${noindex} noindexed, skipped)`);
console.log(`  titles over ${TITLE_MAX} chars:        ${longT.length}`);
console.log(`  descriptions over ${DESC_MAX}:        ${longD.length}`);
console.log(`  descriptions under ${DESC_MIN}:        ${shortD.length}`);
console.log(`  pages with no description:      ${noD.length}`);
console.log(`  pages without exactly one h1:   ${badH1.length}`);
console.log(`  pages with no canonical:        ${noCanon.length}`);
console.log(`  duplicate titles:               ${dup('title').length}`);
console.log(`  duplicate descriptions:         ${dup('desc').length}`);
console.log(`  pages shipping JavaScript:      ${withJs.length}`);

const show = (label, list, fn) => {
  if (!list.length) return;
  console.log(`\n${label}:`);
  for (const r of list.slice(0, 12)) console.log(`  ${fn(r)}`);
  if (list.length > 12) console.log(`  ...and ${list.length - 12} more`);
};
show('Titles too long', longT, (r) => `${r.title.length}  ${r.url}  "${r.title.slice(0, 72)}"`);
show('Descriptions too long', longD, (r) => `${r.desc.length}  ${r.url}`);
show('Descriptions too short', shortD, (r) => `${r.desc.length}  ${r.url}`);
show('Missing description', noD, (r) => r.url);
show('Wrong h1 count', badH1, (r) => `${r.h1s}  ${r.url}`);
show('Ships JavaScript', withJs, (r) => `${r.js} script(s)  ${r.url}`);
for (const [t, urls] of dup('title').slice(0, 6)) console.log(`\nDuplicate title "${t.slice(0,60)}":\n  ${urls.slice(0,4).join('\n  ')}`);
