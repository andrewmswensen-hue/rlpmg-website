/**
 * Collect every [SOURCE NEEDED] and [LEGAL REVIEW] marker into one punch list.
 *
 * Agents were instructed to flag rather than invent, so these markers are a
 * feature. But 180+ of them scattered across 60 files is unusable, and many are
 * the same underlying question asked on different pages. This groups them by
 * theme and by who can answer, and writes docs/source-gaps.md.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (['.astro', '.ts', '.md'].includes(extname(e.name))) out.push(p);
  }
  return out;
}

const RE = /\[(SOURCE NEEDED|LEGAL REVIEW)\s*:?\s*([^\]]*)\]/g;

/** Route each gap to whoever can actually answer it. */
const THEMES = [
  { key: 'Screening and applications', who: 'Leasing team',
    re: /screen|applicant|credit score|income|criminal|co-?signer|guarantor|application fee|adverse action|fcra|occupancy standard|appeal/i },
  { key: 'Money and fees', who: 'Andrew or accounting',
    re: /fee|deposit|charge|cost|price|rate|amount|dollar|refundable|proration|prorated|1099/i },
  { key: 'Timelines and turnaround', who: 'Operations',
    re: /how long|turnaround|timeline|days|response time|deadline|within|business day|elapsed/i },
  { key: 'Ohio law and local ordinance', who: 'Counsel',
    re: /ohio revised code|orc |statut|ordinance|notice period|protected class|fair housing|source of income|registration|lead-based|legal|counsel|eviction process|hearing/i },
  { key: 'Systems, portals and vendors', who: 'Operations',
    re: /portal|url|link|software|vendor|rentengine|buildium|property meld|leadsimple|app\b|platform|mls/i },
  { key: 'Lease terms and policy', who: 'Andrew or counsel',
    re: /lease|policy|clause|renters insurance|utilities|pet|assistance animal|emergency|entry|alteration/i },
  { key: 'Company and people', who: 'Andrew',
    re: /bio|headcount|licen[cs]e number|team|tenure|certification|open position|career|review quote|google business/i },
];

const files = await walk('src');
const rows = [];
for (const f of files) {
  const s = await readFile(f, 'utf8');
  const lines = s.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(RE)) {
      const text = m[2].replace(/\s+/g, ' ').trim();
      if (!text) continue;
      rows.push({ kind: m[1], text, file: relative('src/pages', f).replace(/\/index\.astro$/, '') || 'index', line: i + 1 });
    }
  });
}

/** Collapse the same question asked on several pages. */
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);
const groups = new Map();
for (const r of rows) {
  const k = norm(r.text);
  if (!groups.has(k)) groups.set(k, { ...r, pages: new Set() });
  groups.get(k).pages.add(r.file);
}
const unique = [...groups.values()];

const themed = new Map(THEMES.map((t) => [t.key, []]));
themed.set('Uncategorised', []);
for (const g of unique) {
  const t = THEMES.find((t) => t.re.test(g.text));
  themed.get(t ? t.key : 'Uncategorised').push(g);
}

const L = [
  '# Open source gaps',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} by \`node scripts/source-gaps.mjs\`. Re-run any time.`,
  '',
  `**${rows.length} markers in the codebase, which collapse to ${unique.length} distinct questions.**`,
  '',
  'Every one of these is a fact the site needs and nobody could verify. They are',
  'marked rather than guessed, on purpose: an invented screening threshold or',
  'notice period would be worse than a visible gap. Answer them and the markers',
  'can be replaced with real copy.',
  '',
  'Sorted by who can most likely answer.',
  '',
];

const order = [...THEMES.map((t) => t.key), 'Uncategorised'];
for (const key of order) {
  const list = themed.get(key) ?? [];
  if (!list.length) continue;
  const who = THEMES.find((t) => t.key === key)?.who ?? 'Unassigned';
  L.push(`## ${key}`, '', `_Likely owner: ${who}. ${list.length} question${list.length === 1 ? '' : 's'}._`, '');
  list.sort((a, b) => b.pages.size - a.pages.size);
  for (const g of list) {
    const pages = [...g.pages].sort();
    const where = pages.length > 3
      ? `${pages.slice(0, 3).join(', ')} and ${pages.length - 3} more`
      : pages.join(', ');
    L.push(`- ${g.kind === 'LEGAL REVIEW' ? '**[LEGAL REVIEW]** ' : ''}${g.text}`);
    L.push(`  <br><small>Appears on: ${where}</small>`);
  }
  L.push('');
}

await mkdir('../docs', { recursive: true });
await writeFile('../docs/source-gaps.md', L.join('\n'));
console.log(`docs/source-gaps.md written: ${rows.length} markers, ${unique.length} distinct questions`);
for (const key of order) {
  const n = (themed.get(key) ?? []).length;
  if (n) console.log(`  ${key}: ${n}`);
}
