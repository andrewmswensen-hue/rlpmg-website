/**
 * Doorway-page check for the area pages.
 *
 * Google's scaled content abuse policy targets sets of near-identical pages that
 * differ only by place name, and a service-area section is the classic way to
 * trip it. This measures how much any two area pages actually share.
 *
 * Boilerplate (pricing lines, the CTA, the fee explanation) is legitimately
 * repeated, so some overlap is expected. The gate is set where genuinely
 * templated pages would sit.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const WARN_AT = 0.35;   // one pair sharing over a third of its sentences
const FAIL_AT = 0.55;   // effectively the same page with a name swapped

const dirs = (await readdir('dist', { withFileTypes: true }))
  .filter((e) => e.isDirectory() && e.name.startsWith('property-management-') && e.name !== 'property-management-consultation')
  .map((e) => e.name);

const pages = new Map();
for (const d of dirs) {
  let html;
  try { html = await readFile(join('dist', d, 'index.html'), 'utf8'); } catch { continue; }
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  const text = main.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const sentences = new Set(text.split(/(?<=[.!?]) /).map((s) => s.trim()).filter((s) => s.length > 60));
  pages.set(d.replace('property-management-', '').replace('-ohio', ''), { sentences, words: text.split(' ').length });
}

const keys = [...pages.keys()];
const pairs = [];
for (let i = 0; i < keys.length; i++) {
  for (let j = i + 1; j < keys.length; j++) {
    const a = pages.get(keys[i]).sentences, b = pages.get(keys[j]).sentences;
    let shared = 0;
    for (const s of a) if (b.has(s)) shared++;
    const ratio = shared / Math.max(1, Math.min(a.size, b.size));
    pairs.push({ ratio, a: keys[i], b: keys[j], shared });
  }
}
pairs.sort((x, y) => y.ratio - x.ratio);
const avg = pairs.reduce((s, p) => s + p.ratio, 0) / (pairs.length || 1);
const thin = [...pages.entries()].filter(([, v]) => v.words < 900);

console.log(`duplication: ${pages.size} area pages, ${pairs.length} pairs compared`);
console.log(`  average overlap: ${(avg * 100).toFixed(1)}%`);
console.log(`  worst pair:      ${(pairs[0]?.ratio * 100 || 0).toFixed(1)}%  (${pairs[0]?.a} vs ${pairs[0]?.b})`);
if (thin.length) {
  console.log(`\n  ${thin.length} page(s) under 900 words, thin enough to look templated:`);
  for (const [k, v] of thin) console.log(`    ${v.words}w  ${k}`);
}
const over = pairs.filter((p) => p.ratio >= WARN_AT);
if (over.length) {
  console.log(`\n  ${over.length} pair(s) over ${WARN_AT * 100}% overlap:`);
  for (const p of over.slice(0, 10)) console.log(`    ${(p.ratio * 100).toFixed(1)}%  ${p.a} vs ${p.b}`);
}
if (pairs.some((p) => p.ratio >= FAIL_AT) || thin.length) {
  console.error('\nFAIL: area pages are too similar or too thin to be distinct pages.');
  process.exit(1);
}
console.log('duplication: area pages are distinct');
