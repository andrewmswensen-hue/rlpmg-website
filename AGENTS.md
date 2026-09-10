# How to build a page in this repo

Read `CONTENT_STYLE.md` first. It is not optional; it is the copy contract.

## Non-negotiables

1. **Every number comes from `src/data/facts.ts`.** Import it. Never hardcode a
   price, a fee, a KPI, an address or a phone number in a page.
   If a fact you need is not there, write `[SOURCE NEEDED: what you need]` in the
   page and report it. **Never invent, estimate or infer a number.**
2. **No em dashes or en dashes anywhere.** Not in copy, not in comments.
3. **No emoji.**
4. **Never name a competitor.**
5. **Photography is NOT included in the $0 leasing fee.** It is billed at $250 to $450.
6. **Never publish per-market door counts or per-market days on market.**
7. **Never mention Central Hilltop, South Linden or Franklinton** as areas served.

## File conventions

- Pages live at `src/pages/<path>/index.astro`. `trailingSlash` is `always`.
- Use the existing components. Do not invent new layout primitives:
  `PageHero`, `KeyFacts`, `Faq`, `Cta`, `RelatedLinks`, `Verified`.
- Import the layout as `Base` and pass `title`, `description`, `faq`,
  `breadcrumbs`, and any page-specific `schemaNodes`.
- **Reference implementation: `src/pages/pricing/index.astro`.** Match its shape.

## The design system

Tokens and component classes are in `src/styles/global.css`. Use them.
- Type: Source Serif 4 for headings (automatic on h1 to h4), Inter for everything else.
- Colors as Tailwind classes: `text-navy`, `text-muted`, `text-faint`,
  `text-crimson`, `bg-maroon`, `bg-wash-soft`, `border-line`.
- Sections: `.band`, `.band-tight`, `.band-wash`. Container: `.wrap`.
- Cards: `.card`, `.card-hover`. Buttons: `.btn` plus `.btn-primary` /
  `.btn-ghost` / `.btn-navy` / `.btn-on-dark` / `.btn-outline-light`.
- Wide tables must sit inside `<div class="scroll-x">` so the page body never
  scrolls sideways.
- **Zero JavaScript.** Interactivity uses `<details>`. No client scripts, no
  framework components, no `client:` directives.

## Schema

The layout emits Organization, WebSite, WebPage, BreadcrumbList and FAQPage
automatically. Add page-specific nodes via the `schemaNodes` prop using the
helpers in `src/lib/schema.ts` (`serviceNode`, `articleNode`, `personNode`).

**There is exactly one `LocalBusiness` node on this entire site**, on the
organization. Never add another. City pages emit `Service` with `areaServed`.

## Every page must have

1. One `<h1>` matching search intent
2. A direct answer under 40 words in the opening paragraph, via `PageHero`'s `answer`
3. Specific numbers high on the page
4. Question-shaped `<h2>`s, each answered in the first sentence beneath it
5. An FAQ of 5 or more real questions via the `Faq` component, passed to `Base` as `faq`
6. A `Verified` line
7. `RelatedLinks` with 3 to 5 onward links
8. One primary CTA and one secondary

## Before you finish

Run `npx astro build` and confirm it exits clean. Then grep your own files:

```
grep -n "—\|–" src/pages/<your path>/**/*.astro     # must return nothing
```

Report: files created, any `[SOURCE NEEDED]` markers, and anything you could not
verify. Do not report a page as done if it contains an invented number.
