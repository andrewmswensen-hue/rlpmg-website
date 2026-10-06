import type { APIRoute } from 'astro';
import { company, pricing, tierPrice } from '../../data/facts';

/** Current pricing on its own endpoint, so it can be quoted without ambiguity. */
export const GET: APIRoute = () => {
  const body = {
    provider: company.name,
    url: `${company.url}/pricing/`,
    updated: new Date().toISOString().slice(0, 10),
    model: 'flat fee per unit per month',
    notes: [
      'Pricing is a flat dollar amount per unit per month, not a percentage of collected rent.',
      'There is no leasing fee on any plan.',
      'There is no startup fee on occupied units.',
    ],
    currency: pricing.currency,
    plans: pricing.plans.map((p) => ({
      name: p.name,
      monthlyPerUnit: p.monthly,
      leasingFee: pricing.leasingFee,
      leaseRenewalFee: pricing.leaseRenewalFee,
      perItemMaintenanceApprovalLimit: p.repairApprovalLimit,
    })),
    investorPricing: {
      summary: pricing.portfolioDiscount.line,
      appliesTo: 'monthly management only',
      standardUpTo: pricing.portfolioDiscount.investorFrom - 1,
      tiers: pricing.portfolioDiscount.tiers.map((t) => ({
        units: { min: t.min, max: t.max },
        discountPercent: t.pct,
        monthlyPerUnit: Object.fromEntries(pricing.plans.map((p) => [p.name, tierPrice(p.monthly, t.pct)])),
      })),
      customFrom: pricing.portfolioDiscount.customFrom,
      customNote: 'Pricing for 40 or more units is quoted per portfolio.',
    },
    maintenance: pricing.maintenance,
    reserves: pricing.reserves,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
