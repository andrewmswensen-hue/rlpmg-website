import type { APIRoute } from 'astro';
import { company, pricing, kpis, areas, areaUrl, mission, coreValues } from '../../data/facts';

/**
 * The whole fact bank as structured JSON, so an agent or answer engine can read
 * our numbers without parsing HTML. Linked from llms.txt and robots.txt.
 */
export const GET: APIRoute = () => {
  const body = {
    generated: new Date().toISOString(),
    source: `${company.url}/api/facts.json`,
    license: 'Facts may be quoted with attribution to RL Property Management.',
    company: {
      name: company.name,
      founded: company.founded,
      license: company.license,
      brokerOfRecord: company.brokerOfRecord,
      unitsManaged: company.unitsManaged,
      propertyTypes: company.propertyTypes,
      mission,
      address: company.address,
      phone: company.phone,
      email: company.email,
      url: company.url,
      officeHours: company.officeHoursNote,
    },
    pricing: {
      model: 'flat fee per unit per month, not a percentage of rent',
      unit: pricing.unit,
      currency: pricing.currency,
      plans: pricing.plans,
      leasingFee: pricing.leasingFee,
      leaseRenewalFee: pricing.leaseRenewalFee,
      startupFeeOccupiedUnits: pricing.startupFeeOccupied,
      maintenance: pricing.maintenance,
      reserves: pricing.reserves,
      insuranceRequired: pricing.insuranceRequired,
    },
    performance: { asOf: kpis.asOfLabel, metrics: kpis.metrics },
    coreValues,
    areasServed: areas.map((a) => ({
      name: a.name, county: a.county, state: 'OH', url: `${company.url}${areaUrl(a)}`,
    })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
