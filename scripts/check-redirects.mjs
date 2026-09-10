/**
 * Confirm every URL that exists on the live rlpmg.com today still resolves here.
 *
 * 446 URLs were inventoried from the live WordPress install on 2026-09-09.
 * 437 keep their exact path and 9 redirect. If any of them 404s after cutover we
 * lose the accumulated search equity on that page, so this gate runs on every build.
 *
 * A URL "resolves" if dist/ contains its index.html, or if it is declared in
 * src/data/redirects.mjs (Astro emits a redirect page for those).
 */
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { liveUrls, redirects } from '../src/data/redirects.mjs';

const DIST = 'dist';
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

const missing = [];
const viaRedirect = [];
let ok = 0;

for (const [oldUrl, newUrl] of liveUrls) {
  const target = redirects[oldUrl]?.destination ?? newUrl;
  const file = join(DIST, target.replace(/^\//, ''), 'index.html');
  if (await exists(file)) {
    ok++;
    if (target !== oldUrl) viaRedirect.push([oldUrl, target]);
    continue;
  }
  // Astro writes a small redirect page for configured redirects
  const redirectFile = join(DIST, oldUrl.replace(/^\//, ''), 'index.html');
  if (redirects[oldUrl] && await exists(redirectFile)) { ok++; viaRedirect.push([oldUrl, target]); continue; }
  missing.push([oldUrl, target]);
}

console.log(`redirects: ${ok} of ${liveUrls.length} live URLs resolve (${viaRedirect.length} via a 301)`);
if (missing.length) {
  console.error(`\n${missing.length} LIVE URLS DO NOT RESOLVE:`);
  const byGroup = {};
  for (const [o, t] of missing) {
    const g = o.startsWith('/blog/category/') ? 'blog category'
            : o.startsWith('/blog/') ? 'blog post' : 'page';
    (byGroup[g] ??= []).push(`${o}  ->  ${t}`);
  }
  for (const [g, list] of Object.entries(byGroup)) {
    console.error(`\n  ${g} (${list.length}):`);
    for (const l of list.slice(0, 25)) console.error(`    ${l}`);
    if (list.length > 25) console.error(`    ...and ${list.length - 25} more`);
  }
  console.error('\nThese are pages that exist on rlpmg.com today. Each one still needs building.');
  process.exit(1);
}
console.log('redirects: all live URLs resolve');
