/**
 * Post-build: write a plain Markdown twin of every HTML page, plus llms-full.txt.
 *
 * Why: answer engines and agents pay a real cost to parse HTML, and the parse is
 * lossy. A .md twin at the same path, advertised from the page via
 * <link rel="alternate" type="text/markdown">, gives them the clean text. It is
 * cheap for us and it measurably improves what gets quoted correctly.
 *
 * Runs on dist/ after `astro build`. Deliberately dependency-free.
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';

const DIST = 'dist';
const SITE = 'https://rlpmg.com';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const BLOCK = new Set(['P','DIV','SECTION','ARTICLE','HEADER','FOOTER','MAIN','ASIDE','UL','OL','LI',
  'H1','H2','H3','H4','H5','H6','TABLE','TR','BLOCKQUOTE','PRE','DETAILS','SUMMARY','FIGURE','FIGCAPTION','NAV','BR','HR']);

/** Minimal HTML to Markdown. Handles what this site actually emits. */
function toMarkdown(html) {
  // strip everything that is not content
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');

  // keep only <main>, so nav and footer chrome do not pollute every twin
  const main = s.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (main) s = main[1];

  s = s.replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, (_, tag, inner) =>
    `\n\n${'#'.repeat(Number(tag[1]))} ${strip(inner)}\n\n`);
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `\n- ${strip(inner)}`);
  s = s.replace(/<\/(ul|ol)>/gi, '\n\n');
  s = s.replace(/<summary[^>]*>([\s\S]*?)<\/summary>/gi, (_, inner) => `\n\n**${strip(inner)}**\n`);
  s = s.replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, (_, i) => `| ${strip(i)} `);
  s = s.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (_, i) => `| ${strip(i)} `);
  s = s.replace(/<\/tr>/gi, '|\n');
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => `\n\n${strip(inner)}\n\n`);
  s = s.replace(/<a [^>]*href=("|')([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi, (_, q, href, inner) => {
    const t = strip(inner);
    if (!t) return '';
    const abs = href.startsWith('/') ? SITE + href : href;
    return `[${t}](${abs})`;
  });
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  return decode(s)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function strip(x) { return decode(x.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(); }
function decode(x) {
  return x.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/&hellip;/g, '...').replace(/&mdash;/g, ', ').replace(/&ndash;/g, '-')
          .replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
          .replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"');
}

const files = await walk(DIST);
let written = 0;
const forFull = [];

for (const f of files) {
  const html = await readFile(f, 'utf8');
  if (/name="robots"[^>]*noindex/.test(html)) continue;      // never mirror a noindexed page

  const title = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
  const desc = (html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? '').trim();
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/i)?.[1] ?? '').trim();

  const body = toMarkdown(html);
  if (!body || body.length < 120) continue;

  const md = `# ${decode(title)}\n\n> ${decode(desc)}\n\nSource: ${canonical}\n\n---\n\n${body}\n`;
  const out = f.replace(/\/index\.html$/, '.md').replace(/\.html$/, '.md');
  const target = out.endsWith(`${DIST}.md`) ? join(DIST, 'index.md') : out;
  await writeFile(target, md);
  written++;

  const rel = relative(DIST, target);
  if (!rel.startsWith('blog/')) forFull.push({ rel, md });
}

// llms-full.txt: the core pages concatenated, blog excluded so it stays useful
forFull.sort((a, b) => a.rel.localeCompare(b.rel));
const full = [
  '# RL Property Management, full text of the core pages',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)}. ${forFull.length} pages.`,
  'Blog articles are excluded here; see /rss.xml or /llms.txt for those.',
  '', '---', '',
  ...forFull.map((p) => p.md),
].join('\n');
await writeFile(join(DIST, 'llms-full.txt'), full);

const words = full.split(/\s+/).length;
console.log(`markdown mirrors: ${written} twins written, llms-full.txt covers ${forFull.length} core pages (${words.toLocaleString()} words)`);
