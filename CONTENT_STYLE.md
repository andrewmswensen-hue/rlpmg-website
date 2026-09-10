# Content style

Every page on this site follows this. It exists so twenty pages written at
different times read as one company talking.

## The frame: the customer is the hero, we are the guide

Donald Miller's structure, applied honestly. The owner has a problem. We
understand it, we have a plan, we tell them what to do next, and we are clear
about what success and failure look like. We are not the hero of any sentence.

| Do | Do not |
|---|---|
| "Your rental should not cost you a weekend." | "We are Columbus's premier property management firm." |
| "Here is what happens in the first 30 days." | "We offer a comprehensive onboarding experience." |
| "Call us, get a rent evaluation, decide." | "Contact us today to learn more!" |

**Name the pain before the solution.** Every owner page should touch a real one:
the 11pm call about a furnace, the resident who stopped paying in month three,
the turn that ran three weeks longer than quoted, the manager who would not
return an email, the leasing fee that ate a month of profit.

**Always educate.** The page should be worth reading even if the reader never
hires us. That is the whole basis of both trust and AI citation. A page that
teaches gets quoted; a page that sells gets skipped.

**One clear next step.** One primary call to action per page, plus one softer
option for the not-ready. Never five competing buttons.

## The rules that come from SEO and AI search

1. **Answer in the first 40 words.** The opening paragraph must stand alone if an
   answer engine quotes only that. It names the thing, the place, and a number.
2. **Lead with the number.** "Flat monthly management is $117 per unit" beats
   "our pricing is transparent and competitive." Numbers get quoted; adjectives
   get skipped.
3. **No hedging.** Cut "we believe", "we think", "in our opinion", "arguably".
   Hedging measurably raises a model's uncertainty and lowers citation odds.
4. **Question-shaped H2s, answered immediately underneath.** The first sentence
   below a question heading is the answer, not a restatement of the question.
5. **Be specific and local.** "Franklin County Municipal Court" is worth more than
   a paragraph about suburban charm. Name the county, the court, the utility, the
   ordinance, the neighborhood.
6. **One topic per page.** If two pages could answer the same query, one is
   canonical and the other links to it.
7. **Every page ends with where to go next.** Three to five internal links that a
   real reader would actually want.

## Voice

Calm, procedural, specific. RLPM talks to owners the way a good accountant does:
plain English, exact numbers, no hedging, no hype.

- **"We", never "I".** The company is a team.
- **Short to medium sentences.** Lists when there are steps.
- **Sentence case** for headings. No Title Case Everywhere.
- **No emoji.** Not one.
- **Define jargon once, inline.** "turn", "setout", "cure-or-quit", "NOI".
- **Policy pattern**: stated policy, then real-world nuance, then the number.
  "Rent is due by the 1st. In practice many residents pay between the 1st and the
  5th. Late fees are assessed after the 5th."

## Hard prohibitions

1. **No em dashes or en dashes. Anywhere.** Use a comma, parentheses, a hyphen,
   or split the sentence. This is a standing rule for all of Andrew's writing.
2. **Never invent a number, a policy, a legal detail or a review quote.** Every
   figure comes from `src/data/facts.ts`. If a fact is missing, write
   `[SOURCE NEEDED]` and flag it. Do not estimate. Do not "reasonably assume".
3. **Never name a competitor.** Comparisons describe "a typical 8% manager", not
   a company.
4. **Never claim photography is included** in the $0 leasing fee. It is billed
   separately at $250 to $450.
5. **Never publish per-market door counts.**
6. **Never publish per-market days on market.** Site-wide only, from `kpis`.
7. **Never mention Central Hilltop, South Linden or Franklinton** as areas we work.
8. Avoid absolutes that cannot be true: "always", "never", "every", "guaranteed",
   "#1", "best in Columbus". Exception: a factual never, such as "we never charge
   a leasing fee", which is verifiable.

## Page contract

Every page must have all of this:

1. One `<h1>` matching search intent
2. A direct answer, under 40 words, in the opening paragraph
3. Specific numbers near the top
4. Real semantic HTML with a sane heading order, no skipped levels
5. An FAQ block with `FAQPage` schema, using questions people actually ask
6. A "last verified" date and a named human reviewer
7. Internal links onward
8. One primary call to action, one secondary
9. Readable and complete with CSS and JavaScript disabled

## Words to cut on sight

leverage, utilize, robust, seamless, cutting-edge, best-in-class, world-class,
synergy, holistic, bespoke, curated, elevate, unlock, empower, journey,
passionate, dedicated to excellence, peace of mind (overused, earn it instead),
"we pride ourselves on", "in today's market", "look no further".
