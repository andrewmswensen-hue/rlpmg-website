/**
 * Find hardcoded money figures in page source.
 *
 * The rule on this site is that every number comes from src/data/facts.ts. A
 * literal dollar amount typed into a page is how a wrong price reaches a
 * customer, and it is the single most likely way an agent-written page goes
 * wrong. This lists them so each can be checked or moved into the fact bank.
 *
 * Statutory figures, illustrative examples and cited third-party data are
 * legitimate, so this reports rather than fails.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (extname(e.name) === '.astro') out.push(p);
  }
  return out;
}

/** Everything the fact bank already knows about. */
const facts = await readFile('src/data/facts.ts', 'utf8');
const known = new Set([...facts.matchAll(/\b(\d[\d,]{1,9})\b/g)].map((m) => m[1].replace(/,/g, '')));
for (const n of ['0', '1', '2', '3', '4', '5', '10', '12', '15', '20', '30', '60', '100']) known.add(n);

const rows = [];
for (const f of await walk('src/pages')) {
  const src = await readFile(f, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    // skip source comments and anything already flagged
    const t = line.trim();
    if (t.startsWith('*') || t.startsWith('//') || t.startsWith('<!--')) return;
    for (const m of line.matchAll(/\$\s?(\d[\d,]*)/g)) {
      const raw = m[1].replace(/,/g, '');
      if (known.has(raw)) continue;
      if (line.includes('usd(') && line.indexOf('usd(') < m.index) continue;
      rows.push({ file: relative('src/pages', f).replace(/\/index\.astro$/, ''), line: i + 1, amount: m[0], ctx: t.slice(0, 92) });
    }
  });
}

const byFile = new Map();
for (const r of rows) (byFile.get(r.file) ?? byFile.set(r.file, []).get(r.file)).push(r);

console.log(`numbers: ${rows.length} hardcoded dollar figures across ${byFile.size} page(s)`);
console.log('(statutory amounts, cited third-party data and explicit illustrations are fine; check each)\n');
for (const [file, list] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 14)) {
  console.log(`  ${file}  (${list.length})`);
  for (const r of list.slice(0, 4)) console.log(`      ${r.amount.padEnd(9)} line ${String(r.line).padEnd(5)} ${r.ctx}`);
}
