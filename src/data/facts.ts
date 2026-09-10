/**
 * The fact bank. Every number on this site comes from here, once.
 *
 * Pages, JSON-LD schema, llms.txt and /api/facts.json all read from this file,
 * so a fact can never drift between the human page and the machine version.
 *
 * RULE: never add a fact here that is not traceable to the live site, to a
 * document Andrew supplied, or to something Andrew stated directly. If a number
 * is needed and unknown, add it with `TODO` and leave the page saying so.
 *
 * Sources pulled 2026-09-09 from the live rlpmg.com WordPress REST API.
 */

export const company = {
  name: 'RL Property Management',
  legalName: 'RL Property Management',
  shortName: 'RLPM',
  founded: 2013,
  url: 'https://rlpmg.com',
  email: 'info@rlpmg.com',
  /**
   * Two lines, two jobs, confirmed by Andrew 2026-09-10. Both belong on the site.
   *  - `phone` is the main office line. Use it for residents, vendors, general
   *    contact, the footer, and the LocalBusiness schema, which should carry the
   *    one number a directory or a map result would show.
   *  - `salesPhone` is the sales line. Use it on owner and investor conversion
   *    surfaces: rent evaluation, consultation, pricing, the investors page.
   * Do not mix them. Attribution depends on the split.
   */
  phone: '(614) 725-3059',
  phoneE164: '+16147253059',
  salesPhone: '(614) 212-6903',
  salesPhoneE164: '+16142126903',
  license: 'Licensed real estate brokerage in the State of Ohio',
  officeHoursNote: 'Office hours by appointment only',
  address: {
    street: '750 Cross Pointe Rd STE B',
    city: 'Columbus',
    region: 'OH',
    postalCode: '43230',
    country: 'US',
  },
  /** Publish "700+". Verified against Airtable 2026-09-09: 706 units on active
   *  properties. The rounded claim is accurate and stays true as the count moves. */
  unitsManaged: '700+',
  unitsManagedNumeric: 706,
  activeDoorsVerified: { count: 706, asOf: '2026-09-09', source: 'Airtable Units, Property Is Active' },
  brokerOfRecord: { name: 'Peter Lohmann', title: 'Principal Broker and CEO' },
  propertyTypes: 'single-family homes and small multifamily properties',
  /** Google reviews. Confirmed by Andrew 2026-09-09: 556 live. Publish "550+" so
   *  the claim does not go stale between updates. */
  reviews: { count: 556, display: '550+', rating: 4.3, asOf: '2026-09-09', platform: 'Google' },
  social: {
    youtube: 'https://www.youtube.com/channel/UCLzWGP73xNc-1Wj55M2bUfw',
    instagram: 'https://www.instagram.com/rlpropertymanagement/',
    x: 'https://x.com/RLpmg',
    yelp: 'https://www.yelp.com/biz/rl-property-managment-group-columbus-2',
  },
} as const;

/** Flat monthly management pricing. Per unit, per month. */
export const pricing = {
  currency: 'USD',
  unit: 'per unit, per month',
  leasingFee: 0,
  leaseRenewalFee: 250,
  startupFeeOccupied: 0,
  /**
   * Plan names are deliberately neutral. Renamed from Passive/Standard/Premium
   * on 2026-09-09 at the CIO's direction, so no plan reads as the "better" one.
   * For the same reason there is no "most chosen" badge and no featured styling:
   * three equal plans that differ in one variable, the repair approval limit.
   */
  plans: [
    { id: 'plan-one',   name: 'Plan One',   monthly: 117, repairApprovalLimit: 1500 },
    { id: 'plan-two',   name: 'Plan Two',   monthly: 137, repairApprovalLimit: 750  },
    { id: 'plan-three', name: 'Plan Three', monthly: 184, repairApprovalLimit: 350  },
  ],
  maintenance: {
    inHouseHourly: 84,
    tripCharge: 15,
    rateYear: 2026,
    vendorProjectFeePct: 15,
    vendorProjectFeeAppliesUpTo: 3000,
    vendorProjectFeeCap: 450,
    turnTiers: [
      { upTo: 15000, pct: 15 },
      { upTo: 25000, pct: 10 },
      { upTo: null,  pct: 7.5 },
    ],
  },
  reserves: { min: 350, max: 1500, note: 'per unit, varies by plan' },
  /** After-hours maintenance multipliers, from the Client Handbook. */
  afterHours: { weekdayEveningAndSaturday: 2, sunday: 3 },
  /**
   * The rest of the published fee schedule, from the Client Handbook.
   * These are the charges that can appear on an owner statement. Publishing all
   * of them is the point: it is the thing competitors will not do.
   */
  otherFees: [
    { name: 'Ownership entity change', amount: '$250', note: 'New agreement prepared, plus year-to-date financials for the previous entity.' },
    { name: 'New unit pre-signature inspection', amount: '$300', note: 'Credited toward onboarding if a management agreement is signed.' },
    { name: 'Property photography', amount: '$250 to $450', note: 'New vacant units and units that have had major cosmetic work. Billed at vendor cost plus our standard markup, by property size. Existing photos keep being used at no charge while they still represent the property, and the photos are yours to keep. Effective October 1, 2026.' },
    { name: 'Delinquent tenant setup', amount: '$300', note: 'Applies when taking over an occupied unit whose resident owes more than $300.' },
    { name: 'Turn scope', amount: '$250', note: 'Applies only if you take our turn scope and then have the work done by someone else.' },
    { name: 'Insurance claim oversight', amount: '$1,250', note: 'End to end claim handling. The 15% project management fee is waived on insurance claim work.' },
    { name: 'Early termination', amount: '$450 or $250 per unit', note: '$450 per unit inside the first year, $250 per unit after renewal and mid-term.' },
    { name: 'Appraisal to sale', amount: '$300 per unit', note: 'If we complete a valuation and the property is then sold.' },
    { name: 'Notice posting', amount: 'Labor rate', note: 'No charge to post a 3-day or 30-day notice to vacate.' },
    { name: 'Owner property visit', amount: 'Labor rate', note: 'Key pickup at our office is free.' },
    { name: 'Key copies', amount: '$2.50 each', note: 'We keep two working copies of every unit.' },
    { name: 'Equipment rental', amount: '$1 to $120 per day', note: 'Heating, drying and air-cleaning equipment. Varies by unit.' },
    { name: 'Lawsuit defense', amount: '$75 per hour', note: 'Time spent on any lawsuit other than a normal eviction.' },
    { name: 'Other activities', amount: '$90 per hour', note: 'Work beyond day-to-day management and not otherwise listed.' },
    { name: 'Annual technology and accounting fee', amount: '$125 per business entity', note: 'Covers annual account and tax reporting.' },
    { name: 'Failure to provide possession', amount: "3 months' rent", note: 'If a unit is not handed over at least 14 days before an executed lease starts.' },
    { name: 'Failure to provide evidence of additional insured', amount: '$20 per unit per month', note: 'Until proof of coverage naming us as additional insured is provided.' },
  ],
  /**
   * Portfolio pricing. Andrew 2026-09-09: say the discount is significant, do not
   * publish the numbers, route to a consultation for a quote.
   */
  portfolioDiscount: {
    offered: true,
    publishNumbers: false,
    line: 'Monthly management is discounted for larger portfolios, and the discount is significant.',
  },
  prePurchaseInspection: { fee: 300, note: 'waived from the onboarding fee if a management agreement is signed' },
  /**
   * Eviction costs, from the Client Handbook fee schedule (rlpmg.com/client-handbook/).
   * RESOLVED 2026-09-09: the Owner FAQs page said $130 county + $100 attorney = $230.
   * The Client Handbook, which is the client-facing contract-adjacent document,
   * says $123 county + $150 attorney = $273. The handbook wins. The Owner FAQs
   * page on the old site is stale and should not be migrated as written.
   */
  eviction: {
    attorneyFee: 150,          // paid to the eviction attorney, filing plus up to 2 appearances
    /**
     * FRANKLIN COUNTY ONLY. This is the Franklin County Municipal Court
     * "Eviction Complaint" filing fee. Delaware, Fairfield, Licking, Madison,
     * Union and Pickaway courts each set their own, and none of them are known
     * here. Never present this figure as the fee for a non-Franklin market.
     */
    countyFilingFee: 123,
    countyFilingFeeAppliesTo: 'Franklin County',
    /**
     * [SOURCE NEEDED: eviction complaint filing fees for Delaware, Fairfield,
     * Licking, Union, Madison and Pickaway county municipal courts. Without
     * these, every area page outside Franklin County has to leave the filing
     * cost blank, which is the one number an owner in those markets most wants.]
     */
    otherCountyFilingFees: null,
    hardCostTotal: 273,        // attorney + county, billed to the owner
    rlpmProcessFee: 199,       // paid to RLPM to run the process, up to 2 appearances
    tagAndSetoutFee: 80,       // paid to Franklin County, if required
    setoutFee: 250,            // paid to RLPM, if a setout is required
    typicalTotal: 472,         // 273 hard cost + 199 RLPM, before any setout
    disputeRatePct: 3.5,
  },
  petDamageCoverage: { cap: 4000, note: 'above the security deposit, funded by a monthly pet administration fee; does not apply to service or assistance animals' },
  insuranceRequired: { liabilityMin: 1000000, note: 'Rental Dwelling Policy or Commercial Policy, with RL Property Management listed as an additional insured' },
} as const;

/**
 * The published scorecard.
 *
 * DAYS ON MARKET: set to 20 as a placeholder per Andrew, 2026-09-09.
 * The old site published 11. Actual DOM swings hard week to week (a recent
 * trailing-30 sequence ran 4, 7, 14, 22, 11) and the August-into-September
 * average was 25. A number that volatile cannot be published weekly.
 * See docs/kpi-methodology.md for the recommended fix: publish a trailing
 * 12-month median, define the measure on the page, and refresh quarterly.
 */
export const kpis = {
  asOf: '2026-09-01',
  asOfLabel: 'September 2026',
  /** How each metric is measured. Publishing the definition is itself a trust signal. */
  domDefinition: 'Median days from the date a unit is listed to the date a lease is signed, across all units leased in the trailing 12 months.',
  metrics: [
    { id: 'dom',          value: '20',     label: 'Median days on market' },
    { id: 'turn',         value: '12',     label: 'Median days to turn a unit' },
    { id: 'renewal',      value: '72%',    label: 'Lease renewal rate' },
    { id: 'occupancy',    value: '91%',    label: 'Portfolio occupancy' },
    { id: 'avgRent',      value: '$1,653', label: 'Average rent under management' },
    { id: 'repairDays',   value: '6',      label: 'Median days to close a repair' },
    { id: 'collectedBy5', value: '96%',    label: 'Rent collected by the 5th' },
    { id: 'satisfaction', value: '4.3',    label: 'Resident satisfaction, out of 5' },
  ],
} as const;

/**
 * The 25 communities we serve. `slug` is the URL segment.
 * `existingUrl` marks the seven that already rank on the live site; those keep
 * their exact URLs so their search equity carries over untouched.
 */
/**
 * `county` is what an owner needs in order to know which municipal court hears
 * an eviction and which auditor takes the R.C. 5323.02 filing. Several of these
 * places straddle a county line, and for those the honest answer is that it
 * depends on the parcel. Those entries name every county involved rather than
 * picking one and being wrong for part of the city.
 */
export const areas = [
  { name: 'Columbus',          slug: 'columbus',          county: 'Franklin' },
  { name: 'Dublin',            slug: 'dublin',            county: 'Franklin, Delaware and Union' },
  { name: 'Upper Arlington',   slug: 'upper-arlington',   county: 'Franklin', existingUrl: '/property-management-upper-arlington-ohio/' },
  { name: 'Westerville',       slug: 'westerville',       county: 'Franklin and Delaware', existingUrl: '/property-management-westerville-ohio/' },
  { name: 'Worthington',       slug: 'worthington',       county: 'Franklin', existingUrl: '/property-management-worthington-ohio/' },
  { name: 'Gahanna',           slug: 'gahanna',           county: 'Franklin' },
  { name: 'Hilliard',          slug: 'hilliard',          county: 'Franklin', existingUrl: '/property-management-hilliard-ohio/' },
  { name: 'Powell',            slug: 'powell',            county: 'Delaware', existingUrl: '/property-management-powell-ohio/' },
  { name: 'Reynoldsburg',      slug: 'reynoldsburg',      county: 'Franklin, Licking and Fairfield', existingUrl: '/property-management-reynoldsburg-ohio/' },
  { name: 'Canal Winchester',  slug: 'canal-winchester',  county: 'Franklin and Fairfield', existingUrl: '/property-management-canal-winchester/' },
  { name: 'New Albany',        slug: 'new-albany',        county: 'Franklin' },
  { name: 'Bexley',            slug: 'bexley',            county: 'Franklin' },
  { name: 'Grove City',        slug: 'grove-city',        county: 'Franklin' },
  { name: 'Pickerington',      slug: 'pickerington',      county: 'Fairfield' },
  { name: 'Clintonville',      slug: 'clintonville',      county: 'Franklin', neighborhoodOf: 'Columbus' },
  { name: 'German Village',    slug: 'german-village',    county: 'Franklin', neighborhoodOf: 'Columbus' },
  { name: 'Short North',       slug: 'short-north',       county: 'Franklin', neighborhoodOf: 'Columbus' },
  { name: 'Grandview Heights', slug: 'grandview-heights', county: 'Franklin' },
  { name: 'Blacklick',         slug: 'blacklick',         county: 'Franklin' },
  { name: 'Delaware',          slug: 'delaware',          county: 'Delaware' },
  { name: 'Marysville',        slug: 'marysville',        county: 'Union' },
  { name: 'Lancaster',         slug: 'lancaster',         county: 'Fairfield' },
  { name: 'Newark',            slug: 'newark',            county: 'Licking' },
  { name: 'London',            slug: 'london',            county: 'Madison' },
  { name: 'Ashville',          slug: 'ashville',          county: 'Pickaway' },
] as const;

/**
 * The canonical URL for an area.
 *
 * Three rules, in order:
 *  1. An area that already has a page on the live site keeps that exact URL,
 *     because it already has search equity. Canal Winchester is the odd one out:
 *     it has no `-ohio` suffix and it stays that way.
 *  2. A Columbus neighbourhood nests UNDER the Columbus page rather than sitting
 *     as its peer. Clintonville is part of Columbus, so a flat
 *     /property-management-clintonville-ohio/ would compete with the anchor page
 *     instead of reinforcing it.
 *  3. Everything else follows /property-management-<slug>-ohio/.
 */
export const areaUrl = (a: { slug: string; existingUrl?: string; neighborhoodOf?: string }) => {
  if (a.existingUrl) return a.existingUrl;
  if (a.neighborhoodOf === 'Columbus') return `/property-management-columbus-ohio/${a.slug}/`;
  return `/property-management-${a.slug}-ohio/`;
};

export const coreValues = [
  { name: 'Clear communication',   body: 'Every resident request, owner update and internal process is communicated directly and in plain language.' },
  { name: 'Do it in realtime',     body: 'Lease renewals, maintenance scheduling and client updates are handled immediately, not batched for later.' },
  { name: 'Figure it out and get it done', body: 'Urgent repair, resident dispute or owner financial question, we take ownership and see it through.' },
  { name: 'A place for everything', body: 'Every lease, invoice and request is tracked and stored, so nothing gets lost.' },
  { name: 'We lend a hand, always', body: 'We support owners, residents and teammates without being asked twice.' },
  { name: 'Respect clients, residents and each other', body: 'We listen actively, respond promptly, and handle every situation professionally.' },
] as const;

/**
 * Operating commitments from the Client Handbook. These answer objections and
 * they are quotable, which is exactly what an answer engine wants.
 */
export const commitments = [
  { name: 'Owner funds disbursed on the 10th',
    detail: 'Rent is disbursed electronically on the 10th of each month. It takes about 2 to 3 business days to reach your account.' },
  { name: 'Management fees credited after 60 days of vacancy',
    detail: 'If a property has been listed for rent longer than 60 days, we proactively credit management fees back to your account.' },
  { name: 'No trip charge minimum',
    detail: 'There is no minimum charge on maintenance work, and materials are provided at cost.' },
  { name: 'Project management fee waived on insurance claims',
    detail: 'If you hire us to manage a property or casualty insurance claim, the 15% project management fee is waived on that work.' },
  { name: 'Pet damage covered above the deposit',
    detail: 'If an approved pet causes damage beyond normal wear and tear and the cost exceeds the security deposit, we cover the difference up to $4,000.' },
] as const;

/** Rent handling, from the Client Handbook. */
export const rentPolicy = {
  dueDate: 'the 1st',
  practicalWindow: 'the 1st and the 5th',
  lateFeesAfter: 'the 5th',
  ownerDisbursementDay: 10,
  disbursementNote: 'about 2 to 3 business days to appear in your account',
  monthToMonthIncreasePct: 20,
} as const;

export const mission =
  'Help property owners be successful with their real estate investments.';

/** Formatting helpers so currency renders identically everywhere. */
export const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const priceRange = () => {
  const m = pricing.plans.map((p) => p.monthly);
  return `${usd(Math.min(...m))} to ${usd(Math.max(...m))}`;
};
