/**
 * The JSON-LD graph.
 *
 * One connected graph per page, built from src/data/facts.ts so the structured
 * data can never disagree with the visible copy. Google reads this for rich
 * results; answer engines read it to decide what this business actually is.
 *
 * Node ids are stable and absolute so nodes can reference each other across pages.
 */
import { company, pricing, kpis, areas, areaUrl } from '../data/facts';

const SITE = company.url;
const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;
const abs = (p: string) => (p.startsWith('http') ? p : `${SITE}${p}`);

/** RealEstateAgent is the correct LocalBusiness subtype for a licensed brokerage. */
export function organizationNode() {
  return {
    '@type': ['RealEstateAgent', 'LocalBusiness', 'Organization'],
    '@id': ORG_ID,
    name: company.name,
    url: SITE,
    email: company.email,
    telephone: company.phone,
    foundingDate: String(company.founded),
    description:
      `${company.name} is a licensed Ohio real estate brokerage managing ${company.unitsManaged} ` +
      `${company.propertyTypes} across the Columbus, Ohio metro, with flat monthly pricing and no leasing fee.`,
    slogan: 'Own the asset, not the job.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address.street,
      addressLocality: company.address.city,
      addressRegion: company.address.region,
      postalCode: company.address.postalCode,
      addressCountry: company.address.country,
    },
    areaServed: areas.map((a) => ({
      '@type': 'City',
      name: a.name,
      address: { '@type': 'PostalAddress', addressLocality: a.name, addressRegion: 'OH', addressCountry: 'US' },
    })),
    knowsAbout: [
      'residential property management', 'tenant screening', 'rent collection',
      'Ohio landlord-tenant law', 'Franklin County evictions', 'rental property maintenance',
      'single-family rental investing', 'Columbus Ohio rental market',
    ],
    priceRange: `$${Math.min(...pricing.plans.map((p) => p.monthly))} to $${Math.max(...pricing.plans.map((p) => p.monthly))} per unit per month`,
    currenciesAccepted: 'USD',
    /**
     * The Ohio brokerage licence, as a verifiable credential rather than a
     * marketing claim. Answer engines look for exactly this when deciding
     * whether a property management company is a real licensed entity.
     */
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'Real estate brokerage license',
      identifier: company.licenseNumber,
      recognizedBy: {
        '@type': 'GovernmentOrganization',
        name: 'Ohio Department of Commerce, Division of Real Estate and Professional Licensing',
      },
    },
    employee: { '@id': `${SITE}/team/#peter-lohmann` },
    founder: { '@id': `${SITE}/team/#peter-lohmann` },
    logo: { '@type': 'ImageObject', '@id': `${SITE}/#logo`, url: abs('/images/logo.png') },
    image: { '@id': `${SITE}/#logo` },
    sameAs: Object.values(company.social),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Property management plans',
      itemListElement: pricing.plans.map((p) => ({
        '@type': 'Offer',
        name: `${p.name} property management`,
        price: p.monthly,
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: p.monthly,
          priceCurrency: 'USD',
          unitText: 'per unit per month',
          billingIncrement: 1,
        },
        itemOffered: {
          '@type': 'Service',
          name: `${p.name} property management`,
          serviceType: 'Residential property management',
          provider: { '@id': ORG_ID },
        },
      })),
    },
  };
}

export function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: SITE,
    name: company.name,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/search/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function webPageNode(o: {
  path: string; title: string; description: string;
  datePublished?: string; dateModified?: string; breadcrumbs?: { name: string; path: string }[];
}) {
  const id = `${abs(o.path)}#webpage`;
  return {
    '@type': 'WebPage',
    '@id': id,
    url: abs(o.path),
    name: o.title,
    description: o.description,
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
    inLanguage: 'en-US',
    ...(o.datePublished && { datePublished: o.datePublished }),
    ...(o.dateModified && { dateModified: o.dateModified }),
    ...(o.breadcrumbs?.length && { breadcrumb: { '@id': `${abs(o.path)}#breadcrumb` } }),
  };
}

export function breadcrumbNode(path: string, crumbs: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${abs(path)}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(i < crumbs.length - 1 && { item: abs(c.path) }),
    })),
  };
}

/** FAQPage is the highest-value schema on this site for AI answer extraction. */
export function faqNode(path: string, faq: { q: string; a: string }[]) {
  if (!faq.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${abs(path)}#faq`,
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function serviceNode(o: { path: string; name: string; description: string; areaSlugs?: string[] }) {
  return {
    '@type': 'Service',
    '@id': `${abs(o.path)}#service`,
    name: o.name,
    description: o.description,
    serviceType: o.name,
    provider: { '@id': ORG_ID },
    areaServed: areas.map((a) => ({ '@type': 'City', name: a.name })),
    audience: { '@type': 'Audience', audienceType: 'Rental property owners and real estate investors' },
  };
}

export function articleNode(o: {
  path: string; title: string; description: string; datePublished: string;
  dateModified?: string; image?: string; wordCount?: number; keywords?: string[];
}) {
  return {
    '@type': 'BlogPosting',
    '@id': `${abs(o.path)}#article`,
    headline: o.title.slice(0, 110),
    description: o.description,
    datePublished: o.datePublished,
    dateModified: o.dateModified ?? o.datePublished,
    author: { '@id': `${SITE}/team/#peter-lohmann` },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': SITE_ID },
    mainEntityOfPage: { '@id': `${abs(o.path)}#webpage` },
    inLanguage: 'en-US',
    ...(o.image && { image: abs(o.image) }),
    ...(o.wordCount && { wordCount: o.wordCount }),
    ...(o.keywords?.length && { keywords: o.keywords.join(', ') }),
  };
}

export function personNode(o: { slug: string; name: string; title: string; bio?: string; image?: string }) {
  return {
    '@type': 'Person',
    '@id': `${SITE}/team/#${o.slug}`,
    name: o.name,
    jobTitle: o.title,
    worksFor: { '@id': ORG_ID },
    ...(o.bio && { description: o.bio }),
    ...(o.image && { image: abs(o.image) }),
  };
}

/** Assemble the final graph. Nulls are dropped so a page never emits an empty node. */
export function graph(...nodes: (object | null | undefined)[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}

export { ORG_ID, SITE_ID, abs };
