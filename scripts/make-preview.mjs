/**
 * Turn a production build into a GitHub Pages preview build.
 *
 * GitHub Pages project sites serve from https://<user>.github.io/<repo>/, not from
 * the domain root. Rather than thread a base path through every link in the
 * components (which would then be wrong in production), we build normally for
 * rlpmg.com and rewrite the output afterwards. Production output is untouched.
 *
 * This does three things to dist/:
 *   1. prefixes every root-relative href/src/action with the base path
 *   2. injects <meta name="robots" content="noindex, nofollow"> so the preview
 *      can never compete with the real site or leak into an index
 *   3. drops a .nojekyll file so GitHub serves _astro/ (Jekyll hides underscores)
 *
 * Canonical tags are deliberately left pointing at rlpmg.com. That is correct:
 * the preview should never claim to be canonical for anything.
 *
 *   node scripts/make-preview.mjs /rlpmg-website
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base.startsWith('/')) {
  console.error('usage: node scripts/make-preview.mjs /repo-name');
  process.exit(1);
}
const DIST = 'dist';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

/** Root-relative only. Never touches http(s), //, #, mailto:, tel:, or data:. */
const ATTR = /\b(href|src|action|content)=("|')\/(?!\/)([^"']*)\2/g;
const SRCSET = /\bsrcset=("|')([^"']+)\1/g;

let htmlCount = 0, otherCount = 0;
for (const file of await walk(DIST)) {
  const ext = extname(file);
  if (!['.html', '.css', '.xml', '.txt', '.json', '.md'].includes(ext)) continue;
  let s = await readFile(file, 'utf8');
  const before = s;

  if (ext === '.html') {
    s = s.replace(ATTR, (m, attr, q, path) => {
      // og:url / canonical style meta content should stay absolute; only rewrite real paths
      if (attr === 'content' && !/^(images|fonts|_astro|favicon)/.test(path)) return m;
      return `${attr}=${q}${base}/${path}${q}`;
    });
    s = s.replace(SRCSET, (m, q, val) => {
      const fixed = val.split(',').map((part) => {
        const t = part.trim();
        return t.startsWith('/') && !t.startsWith('//') ? base + t : t;
      }).join(', ');
      return `srcset=${q}${fixed}${q}`;
    });
    if (!/name="robots"[^>]*noindex/.test(s)) {
      s = s.replace(/<meta name="robots"[^>]*>/, '');
      s = s.replace(/<head>/, '<head><meta name="robots" content="noindex, nofollow">');
    }
    htmlCount++;
  } else if (ext === '.css') {
    s = s.replace(/url\((["']?)\/(?!\/)([^)"']*)\1\)/g, (m, q, p) => `url(${q}${base}/${p}${q})`);
    otherCount++;
  }

  if (s !== before) await writeFile(file, s);
}

await writeFile(join(DIST, '.nojekyll'), '');
console.log(`preview build ready: base ${base}, ${htmlCount} html files rewritten, ${otherCount} css files, noindex injected`);
