# rlpmg-website

A ground-up rebuild of [rlpmg.com](https://rlpmg.com) for RL Property Management,
a licensed Ohio residential property management brokerage in Columbus.

Built for three things at once: classical SEO, AI answer-engine visibility, and
lead generation from both property owners and renters.

## Preview

Every push to `main` deploys a **noindexed** preview to GitHub Pages. It is not
production. Canonical tags on every page point at rlpmg.com, so the preview
cannot compete in search.

## Stack

- **Astro 5**, static output, **zero JavaScript** on content pages
- **Tailwind 4** with the design tokens in `src/styles/global.css`
- Self-hosted Inter and Source Serif 4, latin subset, 168KB total
- Deploys as static files, so it runs on any host

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :4321. Restart it after adding a new page file, or Tailwind will not pick up that file's classes. |
| `npm run build` | Production build for rlpmg.com |
| `npm run build:preview` | Production build, then rewritten for the GitHub Pages subpath and noindexed |
| `npm run verify` | Build plus schema, copy and redirect checks |

## Where things live

| Path | Contents |
|---|---|
| `src/data/facts.ts` | **Every number on the site, once.** Pages, JSON-LD, llms.txt and the JSON endpoints all read from here. |
| `src/data/markets.ts` | Per-market tiers and publishable rent medians. Deliberately contains no door counts. |
| `src/data/redirects.mjs` | 301s for the 9 URLs that change. The other 437 keep their paths. |
| `src/lib/schema.ts` | The JSON-LD graph |
| `src/content/blog/` | 384 posts migrated from WordPress |
| `scripts/make-preview.mjs` | Turns a production build into the Pages preview |

## Rules

1. Never invent a number. Everything traces to `src/data/facts.ts`, which is
   sourced from the live site and the Client Handbook.
2. No em dashes or en dashes anywhere.
3. Exactly **one** `LocalBusiness` schema node, on the real Columbus office. City
   pages emit `Service` with `areaServed`, never their own `LocalBusiness`.
4. Per-market door counts are never published.
5. Every page must read as a complete answer with CSS and JavaScript disabled.
