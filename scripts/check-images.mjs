/**
 * Every image the built site asks for must exist, describe itself, and declare
 * its size.
 *
 * This exists because I deleted eighteen photos that were in use. A grep for
 * literal paths could not see them, because Photo.astro builds its URLs from a
 * slug at render time. Checking the built HTML instead of the source is the
 * only way to catch that, so this walks dist and resolves what it finds.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = 'dist';
const errors = [];
const warnings = [];
let pendingBlog = 0;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const exists = async (p) => { try { await stat(p); return true; } catch { return false; } };

const pages = await walk(DIST);
const referenced = new Set();
let imgCount = 0;

for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const url = '/' + relative(DIST, page).replace(/index\.html$/, '');

  // Blog post bodies came from WordPress and still point at rlpmg.com. Image
  // migration is deferred, so those are counted and reported, not failed.
  const isBlogPost = /^\/blog\/[^/]+\/$/.test(url);

  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    imgCount++;
    if (isBlogPost && /src="https?:\/\//.test(tag)) { pendingBlog++; continue; }
    if (!/\balt\s*=/i.test(tag)) errors.push(`${url}: <img> with no alt attribute`);
    if (!/\bwidth\s*=/i.test(tag) || !/\bheight\s*=/i.test(tag)) {
      errors.push(`${url}: <img> without width and height, which allows layout shift`);
    }
    // An alt that just repeats the filename helps nobody.
    const alt = tag.match(/\balt\s*=\s*"([^"]*)"/i)?.[1] ?? '';
    const src = tag.match(/\bsrc\s*=\s*"([^"]*)"/i)?.[1] ?? '';
    if (alt && src && alt.toLowerCase().includes(src.split('/').pop().split('.')[0].toLowerCase())) {
      warnings.push(`${url}: alt text looks like a filename: "${alt}"`);
    }
  }

  for (const m of html.matchAll(/(?:src|href|content)="(\/images\/[^"]+)"/g)) referenced.add(m[1]);
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const c of m[1].split(',')) {
      const u = c.trim().split(/\s+/)[0];
      if (u.startsWith('/images/')) referenced.add(u);
    }
  }
}

for (const url of referenced) {
  if (!(await exists(join(DIST, url)))) errors.push(`missing file: ${url}`);
}

console.log(`images: ${imgCount} <img> tags, ${referenced.size} distinct local image URLs`);
if (pendingBlog) {
  console.log(`images: ${pendingBlog} blog-body images still hosted on rlpmg.com, migration deferred`);
}
if (warnings.length) {
  console.log(`\n${warnings.length} warnings:`);
  for (const w of warnings.slice(0, 10)) console.log('  ' + w);
}
if (errors.length) {
  console.log(`\n${errors.length} IMAGE ERRORS:`);
  for (const e of errors.slice(0, 25)) console.log('  ' + e);
  process.exit(1);
}
console.log('images: all resolve, all have alt text and intrinsic size');
