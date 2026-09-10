/**
 * Page-weight and render-blocking audit over the built output.
 *
 * Not a substitute for Lighthouse, but it measures the things that actually
 * drive the score on a static site: total bytes on the critical path, whether
 * anything blocks render, image weight, and JavaScript.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
async function walk(dir, filter = () => true) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p, filter));
    else if (filter(e.name)) out.push(p);
  }
  return out;
}
const kb = (n) => `${(n / 1024).toFixed(1)}KB`;

const html = await walk(DIST, (n) => n.endsWith('.html'));
const css = await walk(DIST, (n) => n.endsWith('.css'));
const js = await walk(DIST, (n) => n.endsWith('.js'));
const fonts = await walk(DIST, (n) => /\.(woff2?|ttf|otf)$/.test(n));
const imgs = await walk(DIST, (n) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(n));

const size = async (list) => (await Promise.all(list.map(async (f) => (await stat(f)).size))).reduce((a, b) => a + b, 0);

const cssBytes = await size(css);
const jsBytes = await size(js);
const fontBytes = await size(fonts);
const imgBytes = await size(imgs);

const sizes = await Promise.all(html.map(async (f) => ({ f, s: (await stat(f)).size })));
sizes.sort((a, b) => b.s - a.s);
const totalHtml = sizes.reduce((a, b) => a + b.s, 0);

console.log('PAGE WEIGHT');
console.log(`  HTML:   ${html.length} pages, ${kb(totalHtml)} total, ${kb(totalHtml / html.length)} average`);
console.log(`  CSS:    ${css.length} file(s), ${kb(cssBytes)}`);
console.log(`  JS:     ${js.length} file(s), ${kb(jsBytes)}`);
console.log(`  Fonts:  ${fonts.length} file(s), ${kb(fontBytes)}`);
console.log(`  Images: ${imgs.length} file(s), ${kb(imgBytes)}`);
console.log(`\n  Critical path for a first visit: HTML + CSS + 2 fonts = about ${kb(totalHtml / html.length + cssBytes + fontBytes)}`);

console.log('\nHEAVIEST PAGES');
for (const { f, s } of sizes.slice(0, 6)) console.log(`  ${kb(s).padStart(8)}  ${f.replace('dist/', '/')}`);

// render-blocking and third-party checks on a representative page
const sample = await readFile('dist/index.html', 'utf8');
const checks = [
  ['Render-blocking external stylesheets', (sample.match(/<link[^>]*rel="stylesheet"[^>]*>/g) || []).length],
  ['Synchronous external scripts', (sample.match(/<script(?![^>]*(?:async|defer|type="application\/ld\+json"))[^>]*src=/g) || []).length],
  ['Third-party origins referenced', new Set([...sample.matchAll(/https?:\/\/([^/"']+)/g)].map((m) => m[1]).filter((h) => !h.includes('rlpmg.com'))).size],
  ['Fonts preloaded', (sample.match(/rel="preload"[^>]*as="font"/g) || []).length],
  ['Images without an explicit size', (sample.match(/<img(?![^>]*(?:width=|height=))[^>]*>/g) || []).length],
  ['Inline styles on elements', (sample.match(/ style="/g) || []).length],
];
console.log('\nHOMEPAGE CRITICAL PATH');
for (const [k, v] of checks) console.log(`  ${k.padEnd(38)} ${v}`);

const heavy = (await Promise.all(imgs.map(async (f) => ({ f, s: (await stat(f)).size })))).filter((x) => x.s > 200 * 1024);
if (heavy.length) {
  console.log(`\n${heavy.length} IMAGE(S) OVER 200KB, worth optimising:`);
  for (const { f, s } of heavy.slice(0, 8)) console.log(`  ${kb(s).padStart(9)}  ${f.replace('dist/', '/')}`);
}
