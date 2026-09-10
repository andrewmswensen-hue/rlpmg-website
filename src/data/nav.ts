/**
 * Site navigation.
 *
 * Modelled on croskeypm.com: each top-level item opens a panel of grouped links,
 * every link carries a one-line description, and a promo card closes the panel
 * on the right. The description is the point. A bare list of nouns makes a
 * reader guess; "What the fee covers and what it does not" does not.
 *
 * The whole thing works with **zero JavaScript**. Panels open on :hover and on
 * :focus-within, so a keyboard reaches every link by tabbing, and on small
 * screens the same data renders as <details> accordions.
 *
 * Every href here must be a page that exists. scripts/check-links.mjs fails the
 * build otherwise.
 */

export interface NavLink { label: string; href: string; note?: string }
export interface NavGroup { heading: string; links: NavLink[] }
export interface NavPromo {
  eyebrow: string; heading: string; body: string; cta: { label: string; href: string };
}
export interface NavItem {
  label: string;
  href: string;            // the panel's own hub page, so the top item is never a dead end
  groups: NavGroup[];
  promo?: NavPromo;
  columns?: 2 | 3;
}

export const nav: NavItem[] = [
  {
    label: 'Services',
    href: '/services/',
    columns: 3,
    groups: [
      {
        heading: 'Filling the unit',
        links: [
          { label: 'What we do', href: '/services/', note: 'Everything full service management covers.' },
          { label: 'Marketing and leasing', href: '/services/marketing-and-leasing/', note: 'How a vacant unit becomes a signed lease.' },
          { label: 'Resident screening', href: '/services/tenant-screening/', note: 'What we check, applied the same way every time.' },
        ],
      },
      {
        heading: 'Running it',
        links: [
          { label: 'Maintenance', href: '/services/maintenance/', note: 'In-house techs, vetted vendors, 24/7 emergencies.' },
          { label: 'Rent collection', href: '/services/rent-collection/', note: 'What happens when rent does not arrive.' },
          { label: 'Inspections', href: '/services/inspections/', note: 'Quarterly, with what we look for.' },
          { label: 'Owner reporting', href: '/services/owner-reporting/', note: 'Statements, year-end, and the owner portal.' },
        ],
      },
      {
        heading: 'When it goes wrong',
        links: [
          { label: 'Evictions', href: '/services/evictions/', note: 'The Franklin County process, and what it costs.' },
          { label: 'Compliance', href: '/services/compliance/', note: 'Ohio landlord-tenant law and local ordinance.' },
          { label: 'Owner FAQs', href: '/owner-faqs/', note: 'The long answers, in one place.' },
        ],
      },
    ],
    promo: {
      eyebrow: 'Clear pricing',
      heading: 'We publish every fee',
      body: 'Flat monthly management, a $0 leasing fee, and the complete schedule including the charges that only apply in bad months.',
      cta: { label: 'See our pricing', href: '/pricing/' },
    },
  },

  {
    label: 'Tools',
    href: '/tools/',
    columns: 3,
    groups: [
      {
        heading: 'Run the numbers',
        links: [
          { label: 'Rent vs. sell', href: '/rent-vs-sell-calculator/', note: 'Keep it as a rental, or sell it now?' },
          { label: 'Cost of self-managing', href: '/self-management-calculator/', note: 'What your own hours are actually costing.' },
          { label: 'Vacancy cost', href: '/tools/vacancy-cost-calculator/', note: 'What an empty week really costs you.' },
          { label: 'Maintenance reserve', href: '/tools/maintenance-reserve-calculator/', note: 'How much to hold per unit, and why.' },
        ],
      },
      {
        heading: 'Compare your options',
        links: [
          { label: 'Flat fee vs. percentage', href: '/compare/flat-fee-vs-percentage-property-management/', note: 'The arithmetic at three Columbus rents.' },
          { label: 'Self-managing vs. hiring out', href: '/compare/self-managing-vs-property-manager/', note: 'Worth reading even if you keep doing it yourself.' },
          { label: 'Switching managers', href: '/switching-property-managers/', note: 'How to leave one, including what we charge.' },
          { label: 'How to choose a manager', href: '/how-to-choose-a-property-manager-columbus/', note: 'The questions to ask anyone, us included.' },
        ],
      },
      {
        heading: 'Market data',
        links: [
          { label: '2026 market report', href: '/2026-columbus-market-report/', note: 'Columbus single-family rental data.' },
          { label: 'Free rent evaluation', href: '/free-rent-evaluation/', note: 'What your specific property should earn.' },
          { label: 'All tools', href: '/tools/', note: 'Every calculator in one place.' },
        ],
      },
    ],
    promo: {
      eyebrow: 'No email required',
      heading: 'Nothing here is gated',
      body: 'Every calculator runs in your browser and every figure comes from our own Columbus portfolio. Use them without talking to anyone.',
      cta: { label: 'Open the tools', href: '/tools/' },
    },
  },

  {
    label: 'Residents',
    href: '/residents/',
    columns: 3,
    groups: [
      {
        heading: 'Finding a home',
        links: [
          { label: 'Available homes', href: '/homes-for-rent/', note: 'What is open right now across the metro.' },
          { label: 'How to apply', href: '/residents/how-to-apply/', note: 'The steps, the documents, what happens next.' },
          { label: 'Application criteria', href: '/residents/application-criteria/', note: 'What we look at, published in advance.' },
        ],
      },
      {
        heading: 'Living here',
        links: [
          { label: 'Pay rent', href: '/residents/pay-rent/', note: 'Due the 1st, and what happens after the 5th.' },
          { label: 'Request a repair', href: '/residents/maintenance-requests/', note: 'How to submit one, and what counts as an emergency.' },
          { label: 'Moving in', href: '/residents/moving-in/', note: 'Utilities, keys, and the condition report.' },
          { label: 'Moving out', href: '/residents/moving-out/', note: 'Notice, the walkthrough, and your deposit.' },
        ],
      },
      {
        heading: 'Getting help',
        links: [
          { label: 'Resident FAQs', href: '/resident-faqs/', note: 'The questions we get most.' },
          { label: 'Appeal a decision', href: '/residents/appeals/', note: 'If your application was declined.' },
          { label: 'Rental verification', href: '/residents/rental-verification/', note: 'For lenders, landlords and employers.' },
          { label: 'Contact us', href: '/contact-us/', note: 'Phone, email, and how fast we reply.' },
        ],
      },
    ],
    promo: {
      eyebrow: 'For renters',
      heading: 'Most homes tour themselves',
      body: 'Self-guided showings on most of our listings, so you can look on your own schedule. Applications are first come, first served.',
      cta: { label: 'See available homes', href: '/homes-for-rent/' },
    },
  },

  {
    label: 'Areas we serve',
    href: '/areas-we-serve/',
    columns: 3,
    groups: [
      {
        heading: 'Columbus',
        links: [
          { label: 'Columbus', href: '/property-management-columbus-ohio/', note: 'Inside city limits, by neighborhood.' },
          { label: 'Clintonville', href: '/property-management-columbus-ohio/clintonville/', note: 'Franklin County.' },
          { label: 'German Village', href: '/property-management-columbus-ohio/german-village/', note: 'Franklin County.' },
          { label: 'Short North', href: '/property-management-columbus-ohio/short-north/', note: 'Franklin County.' },
          { label: 'Bexley', href: '/property-management-bexley-ohio/', note: 'Its own city, its own code.' },
        ],
      },
      {
        heading: 'North and northwest',
        links: [
          { label: 'Westerville', href: '/property-management-westerville-ohio/', note: 'Its own electric utility.' },
          { label: 'Worthington', href: '/property-management-worthington-ohio/', note: 'Architectural review on older homes.' },
          { label: 'Dublin', href: '/property-management-dublin-ohio/', note: 'Three counties, three courts.' },
          { label: 'Hilliard', href: '/property-management-hilliard-ohio/', note: 'Franklin County, Columbus water.' },
          { label: 'Powell', href: '/property-management-powell-ohio/', note: 'Delaware County, not Franklin.' },
        ],
      },
      {
        heading: 'East and south',
        links: [
          { label: 'Gahanna', href: '/property-management-gahanna-ohio/', note: 'Where our office is.' },
          { label: 'New Albany', href: '/property-management-new-albany-ohio/', note: 'Community development charge.' },
          { label: 'Reynoldsburg', href: '/property-management-reynoldsburg-ohio/', note: 'Spans three counties.' },
          { label: 'Canal Winchester', href: '/property-management-canal-winchester/', note: 'Franklin and Fairfield.' },
          { label: 'Grove City', href: '/property-management-grove-city-ohio/', note: 'Franklin County.' },
        ],
      },
    ],
    promo: {
      eyebrow: 'Local coverage',
      heading: 'One office, not a franchise',
      body: 'Every property we manage is in the Columbus metro, run from one office on Cross Pointe Road, so we can be there in person.',
      cta: { label: 'View all 22 areas', href: '/areas-we-serve/' },
    },
  },

  {
    label: 'Company',
    href: '/about/',
    columns: 3,
    groups: [
      {
        heading: 'About RL',
        links: [
          { label: 'About us', href: '/about/', note: 'Who we are and how we got here.' },
          { label: 'Our team', href: '/team/', note: 'The people who manage your property.' },
          { label: 'Core values', href: '/core-values/', note: 'How we decide when it is not obvious.' },
          { label: 'Careers', href: '/careers/', note: 'Working here.' },
        ],
      },
      {
        heading: 'Trust and transparency',
        links: [
          { label: 'Our scorecard', href: '/key-performance-indicators/', note: 'Our operating numbers, published quarterly.' },
          { label: 'Client handbook', href: '/client-handbook/', note: 'The manual every client gets, in full.' },
          { label: 'Reviews', href: '/reviews/', note: 'What owners and residents say.' },
          { label: 'Editorial policy', href: '/editorial-policy/', note: 'Who writes this, and who checks it.' },
          { label: 'AI and human oversight', href: '/ai-content-policy/', note: 'Where we use AI, and who reviews it.' },
        ],
      },
      {
        heading: 'Read and reach us',
        links: [
          { label: 'In-depth guides', href: '/guides/', note: 'The long answers, properly researched.' },
          { label: 'All articles', href: '/blog/', note: 'Everything we have written.' },
          { label: 'Policy updates', href: '/policy-updates/', note: 'What is changing for Central Ohio landlords.' },
          { label: 'Contact us', href: '/contact-us/', note: 'Phone, email, and office hours.' },
        ],
      },
    ],
    promo: {
      eyebrow: 'For investors',
      heading: 'Portfolio pricing is different',
      body: 'Monthly management is discounted meaningfully as unit count rises. We quote it per owner rather than publishing it.',
      cta: { label: 'Get a portfolio quote', href: '/property-management-consultation/' },
    },
  },
];

/** Sits beside the panels as a plain link, the way croskeypm.com treats listings. */
export const navDirect: NavLink[] = [
  { label: 'Available homes', href: '/homes-for-rent/' },
];
