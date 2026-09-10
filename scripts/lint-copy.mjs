/**
 * Enforce CONTENT_STYLE.md on the pages we write.
 *
 * Scope is deliberately src/pages and src/components only. The 384 migrated blog
 * posts are Peter's published work from 2018 onward and are exempt from the
 * style rules, with one exception: the em dash ban, which the importer already
 * handled, and which is re-checked here.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

async function walk(dir, exts) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p, exts));
    else if (exts.includes(extname(e.name))) out.push(p);
  }
  return out;
}

const BANNED_WORDS = [
  'leverage', 'utilize', 'robust', 'seamless', 'cutting-edge', 'best-in-class',
  'world-class', 'synergy', 'holistic', 'bespoke', 'curated', 'elevate',
  'unlock', 'empower', 'passionate', 'we pride ourselves',
  'look no further', 'in today\'s market', 'peace of mind',
];
const HEDGES = ['we believe', 'we think', 'in our opinion', 'arguably', 'it could be argued'];
const ABSOLUTES = ['best in columbus', 'number one', 'the best property manage', 'unbeatable', 'guaranteed results'];
/** "#1" as a claim, not as part of a hex colour like #123143. */
const RANK_CLAIM = /#1\b(?![0-9a-f])/i;

const errors = [], warnings = [], notes = [];

// 1. Em and en dashes: everywhere, including migrated posts.
for (const f of [...await walk('src/pages', ['.astro', '.ts']), ...await walk('src/components', ['.astro']),
                 ...await walk('src/content', ['.md', '.mdx'])]) {
  const s = await readFile(f, 'utf8');
  const lines = s.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('—') || l.includes('–')) {
      errors.push(`${f}:${i + 1}: em or en dash`);
    }
  });
}

// 2. Style rules: our own pages and components only.
for (const f of [...await walk('src/pages', ['.astro']), ...await walk('src/components', ['.astro'])]) {
  const s = await readFile(f, 'utf8');
  const lower = s.toLowerCase();
  for (const w of BANNED_WORDS) if (lower.includes(w)) warnings.push(`${f}: banned word "${w}"`);
  for (const h of HEDGES) if (lower.includes(h)) errors.push(`${f}: hedging phrase "${h}"`);
  for (const a of ABSOLUTES) if (lower.includes(a)) warnings.push(`${f}: unprovable absolute "${a}"`);
  if (RANK_CLAIM.test(s)) warnings.push(`${f}: unprovable rank claim "#1"`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s.replace(/[✓✔→−]/g, ''))) {
    warnings.push(`${f}: emoji`);
  }
  const m = s.match(/\[SOURCE NEEDED[^\]]*\]/g);
  if (m) for (const x of m) notes.push(`${f}: ${x}`);
  // A page with no h1 is a structural bug.
  if (f.includes('src/pages') && !f.endsWith('.ts')) {
    if (!/<h1|PageHero/.test(s) && !f.includes('404')) warnings.push(`${f}: no h1 and no PageHero`);
  }
}

console.log(`copy lint: ${errors.length} errors, ${warnings.length} warnings, ${notes.length} source gaps`);
if (notes.length) {
  console.log('\nOpen [SOURCE NEEDED] markers:');
  for (const n of notes) console.log(`  ${n}`);
}
if (warnings.length) {
  console.log('\nWarnings:');
  for (const w of warnings.slice(0, 30)) console.log(`  ${w}`);
  if (warnings.length > 30) console.log(`  ...and ${warnings.length - 30} more`);
}
if (errors.length) {
  console.error(`\n${errors.length} COPY ERRORS:`);
  for (const e of errors.slice(0, 40)) console.error(`  ${e}`);
  process.exit(1);
}
console.log('copy lint: clean');
