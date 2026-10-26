/**
 * Fast syntax check for individual files, without a full build.
 *
 *   node scripts/check-syntax.mjs src/pages/pricing/index.astro src/data/facts.ts
 *
 * Exists so several editors can work on different files at once and each
 * confirm they did not break a template literal or a {expression}, without
 * running `npm run build` concurrently (parallel builds fight over dist/).
 * .astro files go through Astro's own compiler, .ts files through esbuild.
 */
import { transform } from '@astrojs/compiler';
import { transform as esbuild } from 'esbuild';
import { readFile } from 'node:fs/promises';

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node scripts/check-syntax.mjs <files...>'); process.exit(2); }
let bad = 0;
for (const f of files) {
  const src = await readFile(f, 'utf8');
  try {
    if (f.endsWith('.astro')) {
      const r = await transform(src, { filename: f });
      const errs = (r.diagnostics || []).filter((d) => d.severity === 1);
      if (errs.length) throw new Error(errs.map((d) => `${d.text} (line ${d.location?.line})`).join('; '));
      // The frontmatter is TypeScript; compile the generated module to catch errors inside it too.
      await esbuild(r.code, { loader: 'ts', format: 'esm' });
    } else {
      await esbuild(src, { loader: 'ts', format: 'esm' });
    }
    console.log(`ok    ${f}`);
  } catch (e) {
    bad++;
    console.log(`FAIL  ${f}\n      ${String(e.message || e).split('\n').slice(0, 4).join('\n      ')}`);
  }
}
process.exit(bad ? 1 : 0);
