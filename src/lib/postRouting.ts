/**
 * Route a blog post to the pages it should feed.
 *
 * 62% of the migrated posts linked to no conversion page at all, and none
 * linked to /pricing/ or /services/. That is 331 posts carrying up to eight
 * years of accumulated authority, all of it terminating in a dead end instead
 * of flowing to the pages that need to rank.
 *
 * The fix is a topic-aware block in the post template rather than 331 hand
 * edits: match on what the post is actually about, then offer two to four
 * genuinely relevant destinations. Relevance is the whole point. A block of the
 * same four links on every post is link spam and gets discounted; a block that
 * sends an eviction post to the eviction page is a real signal and a real
 * service to the reader.
 */
import { areas, areaUrl } from '../data/facts';

export interface Destination { href: string; label: string; note: string }

interface Rule { test: RegExp; weight: number; dest: Destination }

/** Matched against title, categories and tags, in that order of confidence. */
const RULES: Rule[] = [
  { test: /screen|applicant|background check|credit check|good tenant|fair housing/i, weight: 3,
    dest: { href: '/services/tenant-screening/', label: 'How we screen residents', note: 'The criteria, applied the same way to every applicant.' } },
  { test: /evict|non.?payment|3.?day notice|setout|set.?out/i, weight: 3,
    dest: { href: '/services/evictions/', label: 'Evictions, and what they cost', note: 'The Franklin County process, with the current fees.' } },
  { test: /rent collection|late fee|collect(ing)? rent|tenant stops paying/i, weight: 3,
    dest: { href: '/services/rent-collection/', label: 'How we collect rent', note: 'Due the 1st, and what happens after the 5th.' } },
  { test: /maintenance|repair|hvac|plumbing|appliance|emergency call/i, weight: 2,
    dest: { href: '/services/maintenance/', label: 'Maintenance and repairs', note: 'In-house techs, vetted vendors, 24/7 emergencies.' } },
  { test: /inspect/i, weight: 2,
    dest: { href: '/services/inspections/', label: 'Property inspections', note: 'Quarterly, and what we look for.' } },
  { test: /turnover|turn cost|rent.?ready|make.?ready|vacan/i, weight: 2,
    dest: { href: '/tools/vacancy-cost-calculator/', label: 'What a vacancy costs', note: 'The daily and annual cost of an empty unit.' } },
  { test: /rent (or|vs\.?) sell|should i sell|selling (my|your) (home|rental)/i, weight: 3,
    dest: { href: '/rent-vs-sell-calculator/', label: 'Rent vs. sell calculator', note: 'Run your own numbers on keeping it or selling.' } },
  { test: /self.?manag|diy landlord|manage it yourself/i, weight: 3,
    dest: { href: '/self-management-calculator/', label: 'What self-managing costs', note: 'Your hours, your vacancy, priced out.' } },
  { test: /fee|pricing|cost of property management|how much does.*(manage|property manager)|percentage/i, weight: 2,
    dest: { href: '/pricing/', label: 'What management costs', note: 'The complete published fee schedule, including the rare charges.' } },
  { test: /portfolio|investor|scal(e|ing)|multiple properties|out.?of.?state|cap rate|noi|cash flow/i, weight: 2,
    dest: { href: '/investors/', label: 'For portfolio owners', note: 'Discounted management as unit count rises.' } },
  { test: /choos|hir(e|ing) a property manage|switch|questions to ask/i, weight: 2,
    dest: { href: '/how-to-choose-a-property-manager-columbus/', label: 'How to choose a manager', note: 'The questions worth asking anyone, us included.' } },
  { test: /lease|renewal|tenancy|resident retention/i, weight: 1,
    dest: { href: '/services/compliance/', label: 'Leases and compliance', note: 'A lease reviewed by counsel, and Ohio law.' } },
  { test: /market|rent price|rental rate|how much.*rent for/i, weight: 2,
    dest: { href: '/free-rent-evaluation/', label: 'Free rent evaluation', note: 'What your specific property should earn.' } },
  { test: /statement|report|accounting|1099|owner portal|bookkeep/i, weight: 2,
    dest: { href: '/services/owner-reporting/', label: 'Owner reporting', note: 'Statements, year-end, and the portal.' } },
  { test: /tenant|resident|renter|applic/i, weight: 1,
    dest: { href: '/residents/application-criteria/', label: 'Our application criteria', note: 'Published in advance, applied consistently.' } },
];

/** Always worth offering when nothing else matches strongly. */
const FALLBACK: Destination[] = [
  { href: '/pricing/', label: 'What management costs', note: 'Flat monthly pricing and a $0 leasing fee, published in full.' },
  { href: '/free-rent-evaluation/', label: 'Free rent evaluation', note: 'What your property should earn, using our own portfolio data.' },
];

/** A post that names a city we serve should feed that city's page. */
function areaFor(text: string): Destination | null {
  for (const a of areas) {
    const rx = new RegExp(`\\b${a.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (rx.test(text)) {
      return { href: areaUrl(a), label: `Property management in ${a.name}`, note: `What we do in ${a.name}, and the local rules that apply.` };
    }
  }
  return null;
}

export function destinationsFor(opts: {
  title: string; categories: string[]; tags: string[]; body: string; exclude?: string[];
}): Destination[] {
  const signal = `${opts.title} ${opts.categories.join(' ')} ${opts.tags.join(' ')}`;
  const scored = new Map<string, { d: Destination; score: number }>();

  for (const r of RULES) {
    let score = 0;
    if (r.test.test(signal)) score += r.weight * 2;          // title and taxonomy are strong
    else if (r.test.test(opts.body.slice(0, 2500))) score += r.weight;  // opening body is weaker
    if (score > 0) {
      const prev = scored.get(r.dest.href);
      if (!prev || prev.score < score) scored.set(r.dest.href, { d: r.dest, score });
    }
  }

  // Columbus appears in nearly every post, so only take a city match from the
  // title, where naming a place is deliberate.
  const area = areaFor(opts.title);
  if (area && area.href !== '/property-management-columbus-ohio/') {
    scored.set(area.href, { d: area, score: 5 });
  }

  const exclude = new Set(opts.exclude ?? []);
  const ranked = [...scored.values()]
    .filter((x) => !exclude.has(x.d.href))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.d);

  const out = ranked.slice(0, 4);
  for (const f of FALLBACK) {
    if (out.length >= 3) break;
    if (!out.some((d) => d.href === f.href) && !exclude.has(f.href)) out.push(f);
  }
  return out.slice(0, 4);
}
