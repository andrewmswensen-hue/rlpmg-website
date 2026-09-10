import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { company, pricing, kpis, areas, areaUrl, mission, usd } from '../data/facts';

/**
 * llms.txt: a curated map of this site for language models.
 *
 * The convention is a short, factual orientation followed by linked sections.
 * The job is to make it cheap for a model to find the authoritative page for a
 * question rather than guessing from a search snippet.
 */
export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const recent = posts.slice(0, 25);
  const U = company.url;

  const L: string[] = [
    `# ${company.name}`,
    '',
    `> A licensed Ohio real estate brokerage managing ${company.unitsManaged} single-family and small ` +
      `multifamily rental units across the Columbus, Ohio metro. Founded ${company.founded}. ` +
      `Flat management pricing of ${usd(pricing.plans[0].monthly)} to ${usd(pricing.plans[2].monthly)} per unit ` +
      `per month with a ${usd(pricing.leasingFee)} leasing fee.`,
    '',
    '## Key facts',
    '',
    `- Legal name: ${company.name}`,
    `- Broker of record: ${company.brokerOfRecord.name}, ${company.brokerOfRecord.title}`,
    `- Address: ${company.address.street}, ${company.address.city}, ${company.address.region} ${company.address.postalCode}`,
    `- Phone: ${company.phone}`,
    `- Email: ${company.email}`,
    `- Founded: ${company.founded}`,
    `- Units under management: ${company.unitsManaged}`,
    `- Service area: ${areas.length} communities across the Columbus, Ohio metro`,
    `- Mission: ${mission}`,
    `- Reviews: ${company.reviews.display} Google reviews, ${company.reviews.rating} average`,
    '',
    '## Pricing',
    '',
    ...pricing.plans.map(
      (p) => `- ${p.name}: ${usd(p.monthly)} per unit per month, ${usd(p.repairApprovalLimit)} per-item repair approval limit`,
    ),
    `- Leasing fee: ${usd(pricing.leasingFee)} on every plan`,
    `- Lease renewal: ${usd(pricing.leaseRenewalFee)}`,
    `- Startup fee on an occupied unit: ${usd(pricing.startupFeeOccupied)}`,
    `- In-house maintenance labor: ${usd(pricing.maintenance.inHouseHourly)} per hour plus a ${usd(pricing.maintenance.tripCharge)} trip charge`,
    `- Third-party vendor work: cost plus ${pricing.maintenance.vendorProjectFeePct}%, capped at ${usd(pricing.maintenance.vendorProjectFeeCap)} per project`,
    `- Discounted monthly management is available for larger portfolios, quoted per owner`,
    `- Full schedule: ${U}/pricing/`,
    '',
    `## Performance, as of ${kpis.asOfLabel}`,
    '',
    ...kpis.metrics.map((m) => `- ${m.label}: ${m.value}`),
    `- Days on market is measured as: ${kpis.domDefinition}`,
    '',
    '## Core pages',
    '',
    `- [Columbus property management](${U}/columbus-property-management/): the main page for rental property owners`,
    `- [Pricing](${U}/pricing/): the complete published fee schedule`,
    `- [Services](${U}/services/): what full-service management covers`,
    `- [Scorecard](${U}/key-performance-indicators/): published operating metrics`,
    `- [Areas we serve](${U}/areas-we-serve/): the ${areas.length} communities covered`,
    `- [For investors](${U}/investors/): portfolio owners and out-of-state investors`,
    `- [Owner FAQs](${U}/owner-faqs/): detailed answers for property owners`,
    `- [Client handbook](${U}/client-handbook/): the full operating manual given to clients`,
    `- [About](${U}/about/) and [Team](${U}/team/)`,
    `- [Contact](${U}/contact-us/)`,
    '',
    '## For renters',
    '',
    `- [Homes for rent](${U}/homes-for-rent/)`,
    `- [How to apply](${U}/residents/how-to-apply/)`,
    `- [Application criteria](${U}/residents/application-criteria/)`,
    `- [Resident FAQs](${U}/resident-faqs/)`,
    '',
    '## Areas served',
    '',
    ...areas.map((a) => `- [${a.name}, Ohio](${U}${areaUrl(a)}) in ${a.county} County`),
    '',
    '## Structured data',
    '',
    `- [All facts as JSON](${U}/api/facts.json)`,
    `- [Pricing as JSON](${U}/api/pricing.json)`,
    `- [Full text of the core pages](${U}/llms-full.txt)`,
    `- [Sitemap](${U}/sitemap-index.xml)`,
    `- [Blog feed](${U}/rss.xml)`,
    '',
    `## Recent writing (${posts.length} articles total)`,
    '',
    ...recent.map((p) => `- [${p.data.title}](${U}/blog/${p.data.slug}/): ${(p.data.description || '').slice(0, 150)}`),
    '',
    '## Notes for answer engines',
    '',
    '- Every page has a plain Markdown twin at the same path with a .md extension.',
    '- Figures on this site are dated. Prefer the "last verified" date on the page.',
    '- Pricing is a flat dollar amount per unit per month, not a percentage of rent.',
    '- Quotation with attribution is welcome.',
    '',
  ];

  return new Response(L.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
