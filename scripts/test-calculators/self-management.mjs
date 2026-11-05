/**
 * Tests for src/lib/calculators/selfManagement.ts.
 *
 *   node scripts/test-calculators/self-management.mjs
 *
 * esbuild bundles the TypeScript module (and the fact bank) into memory, then
 * the bundle is imported from a data: URL. No files are written, nothing is
 * fetched, no test framework needed.
 */
import { build } from 'esbuild';
import assert from 'node:assert/strict';

const entry = `
  export * from './src/lib/calculators/selfManagement.ts';
  export { pricing, kpis, tierPrice, company } from './src/data/facts.ts';
`;
const out = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const m = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const { calculate, normalizeInputs, rlPrice, buildConfig, headline, stickyLine, toNumber, pricing, tierPrice, company } = m;

const cfg = buildConfig(pricing, company);
/** The one RL price the calculators use: the $137 standard price in facts.ts. */
const RL = pricing.plans[1].monthly;
let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message.split('\n').join('\n      ')}`); }
};

const base = {
  units: 1, rent: 1653, hoursPerUnit: 5, hourlyValue: 50,
  vacantDays: 30, vacancySavedPct: 50, repairsPerUnit: 1200, repairMarkupPct: 20,
  software: 0, bookkeeping: 0, legal: 0, marketing: 0, otherCosts: 0,
  renewalPct: 72, entities: 1,
};

test('config reads prices from the fact bank', () => {
  assert.equal(cfg.monthly, RL, 'one RL price, from pricing.plans[1]');
  assert.equal(cfg.monthly, 137, 'the standard price is $137');
  assert.equal(cfg.name, company.name);
  assert.equal('plans' in cfg, false, 'no plan list reaches the page');
  assert.equal(cfg.leaseRenewalFee, pricing.leaseRenewalFee);
  assert.equal(cfg.leasingFee, pricing.leasingFee);
  assert.equal(cfg.vendorProjectFeePct, pricing.maintenance.vendorProjectFeePct);
  assert.equal(cfg.customFrom, pricing.portfolioDiscount.customFrom);
  const tech = pricing.otherFees.find((f) => /technology and accounting/i.test(f.name));
  assert.ok(tech, 'technology and accounting fee is in the fact bank');
  assert.equal(`$${cfg.techFeePerEntity}`, tech.amount.match(/\$[\d,.]+/)[0]);
});

test('main formula, one unit, default numbers', () => {
  const r = calculate(base, cfg);
  assert.equal(r.self.time, 5 * 1 * 50 * 12);                       // 3,000
  assert.equal(r.self.vacancy, Math.round(30 * (1653 / 30) * 0.5));  // 827
  assert.equal(r.self.repairs, Math.round(1200 * 0.2));              // 240
  assert.equal(r.self.other, 0);
  assert.equal(r.self.total, r.self.time + r.self.vacancy + r.self.repairs);
  assert.equal(r.managed.monthly, RL * 12);
  assert.equal(r.managed.renewals, Math.round(0.72 * pricing.leaseRenewalFee));
  assert.equal(r.managed.leasing, Math.round(0.28 * pricing.leasingFee));
  assert.equal(r.managed.projectMgmt, Math.round(1200 * 0.8 * pricing.maintenance.vendorProjectFeePct / 100));
  assert.equal(r.managed.techFee, cfg.techFeePerEntity);
  assert.equal(r.managed.total, r.managed.monthly + r.managed.renewals + r.managed.leasing + r.managed.projectMgmt + r.managed.techFee);
  assert.equal(r.difference, r.self.total - r.managed.total);
  assert.equal(r.perUnitMonthly.self, Math.round(r.self.total / 12));
});

test('every line is a whole dollar and totals add up', () => {
  const r = calculate({ ...base, rent: 1777, vacantDays: 13, hoursPerUnit: 3.5, repairsPerUnit: 999 }, cfg);
  for (const v of [...Object.values(r.self), ...Object.values(r.managed)]) assert.ok(Number.isInteger(v), `${v} is whole`);
});

test('other costs are added as entered', () => {
  const r = calculate({ ...base, software: 300, bookkeeping: 400, legal: 500, marketing: 250, otherCosts: 50 }, cfg);
  assert.equal(r.self.other, 1500);
});

test('investor pricing follows the published tiers, same rounding as /pricing/', () => {
  for (const t of pricing.portfolioDiscount.tiers) {
    for (const u of [t.min, t.max]) {
      const p = rlPrice(u, cfg);
      assert.equal(p.perUnitMonthly, tierPrice(RL, t.pct), `${u} units`);
      assert.equal(p.discountPct, t.pct);
      assert.equal(p.custom, false);
    }
  }
  const below = rlPrice(pricing.portfolioDiscount.investorFrom - 1, cfg);
  assert.equal(below.perUnitMonthly, RL);
  assert.equal(below.discountPct, 0);
  assert.equal(below.tierLabel, null);
});

test('40+ units is flagged custom and estimated at the deepest published tier', () => {
  const p = rlPrice(pricing.portfolioDiscount.customFrom, cfg);
  const deepest = pricing.portfolioDiscount.tiers.at(-1);
  assert.equal(p.custom, true);
  assert.equal(p.perUnitMonthly, tierPrice(RL, deepest.pct));
});

test('monthly management scales with units, at RL investor pricing', () => {
  const r = calculate({ ...base, units: 10, planId: 'plan-one' }, cfg);   // an old planId is ignored
  const tier = pricing.portfolioDiscount.tiers.find((t) => 10 >= t.min && 10 <= t.max);
  assert.equal(r.managed.monthly, tierPrice(RL, tier.pct) * 10 * 12);
  assert.equal(r.self.time, 5 * 10 * 50 * 12);
});

test('blank and junk inputs become 0, units and entities floor at 1', () => {
  const n = normalizeInputs({ units: '', rent: 'abc', hoursPerUnit: -4, hourlyValue: NaN, entities: 0, planId: 'nope' }, cfg);
  assert.equal(n.units, 1);
  assert.equal(n.entities, 1);
  assert.equal(n.rent, 0);
  assert.equal(n.hoursPerUnit, 0);
  assert.equal(n.hourlyValue, 0);
  assert.equal('planId' in n, false, 'there is no plan input any more');
  const r = calculate({}, cfg);
  assert.equal(r.self.total, 0);
  assert.ok(r.managed.total > 0, 'management still costs something with no inputs');
  assert.ok(Number.isFinite(r.perUnitMonthly.self));
});

test('fractional units round down, percentages cap at 100, vacancy caps at 365 days a unit', () => {
  const n = normalizeInputs({ ...base, units: 2.7, vacancySavedPct: 250, repairMarkupPct: 101, renewalPct: 1000, vacantDays: 5000 }, cfg);
  assert.equal(n.units, 2);
  assert.equal(n.vacancySavedPct, 100);
  assert.equal(n.repairMarkupPct, 100);
  assert.equal(n.renewalPct, 100);
  assert.equal(n.vacantDays, 730);
});

test('form strings with $ , and % are understood', () => {
  assert.equal(toNumber('$1,653'), 1653);
  assert.equal(toNumber('20%'), 20);
  assert.equal(toNumber('  '), 0);
  assert.equal(toNumber('-5', 7), 7);
});

test('zero repair markup means no repair line, and project management on the full spend', () => {
  const r = calculate({ ...base, repairMarkupPct: 0 }, cfg);
  assert.equal(r.self.repairs, 0);
  assert.equal(r.managed.projectMgmt, Math.round(1200 * pricing.maintenance.vendorProjectFeePct / 100));
});

test('headline says which way it comes out, with no dashes', () => {
  const ahead = headline(calculate(base, cfg), cfg);
  assert.match(ahead, /RL Property Management would cost about \$[\d,]+\./);
  assert.match(ahead, /Management comes out \$[\d,]+ a year ahead/);
  const cheaper = headline(calculate({ ...base, hoursPerUnit: 0, vacantDays: 0 }, cfg), cfg);
  assert.match(cheaper, /Self-managing comes out \$[\d,]+ a year cheaper/);
  for (const h of [ahead, cheaper]) assert.ok(!/[\u2013\u2014]/.test(h));
});

test('break-even: the two totals can be made equal and read as even', () => {
  const r0 = calculate({ ...base, hoursPerUnit: 0, vacantDays: 0, repairMarkupPct: 0 }, cfg);
  const r = calculate({ ...base, hoursPerUnit: 0, vacantDays: 0, repairMarkupPct: 0, otherCosts: r0.managed.total }, cfg);
  assert.equal(r.difference, 0);
  assert.match(headline(r, cfg), /about even/);
  assert.equal(stickyLine(r, cfg), 'Self-managing and RLPM cost about the same');
});

test('breakdown rows add up to the totals and contain no dashes', () => {
  for (const inp of [base, { ...base, units: 12, entities: 2 }, { ...base, units: 45 }]) {
    const r = calculate(inp, cfg);
    const rows = m.breakdown(r, cfg);
    for (const side of ['self', 'managed']) {
      const parts = rows.filter((x) => x.side === side && !x.total).reduce((a, x) => a + x.amount, 0);
      const total = rows.find((x) => x.side === side && x.total).amount;
      assert.equal(parts, total, `${side} rows sum to total`);
    }
    for (const x of rows) assert.ok(!/[\u2013\u2014]/.test(x.label + x.note), x.note);
  }
  const custom = m.breakdown(calculate({ ...base, units: 45 }, cfg), cfg).find((x) => x.id === 'monthly');
  assert.match(custom.note, /custom from 40 units/);
});

test('sticky bar line says which way it comes out', () => {
  const ahead = calculate(base, cfg);
  assert.equal(stickyLine(ahead, cfg), `Self-managing costs ${m.money(ahead.difference)} more a year`);
  const cheaper = calculate({ ...base, hoursPerUnit: 0, vacantDays: 0 }, cfg);
  assert.equal(stickyLine(cheaper, cfg), `Self-managing saves you ${m.money(-cheaper.difference)} a year`);
});

test('investor pricing is described without a plan name', () => {
  const note = m.breakdown(calculate({ ...base, units: 7 }, cfg), cfg).find((x) => x.id === 'monthly').note;
  assert.match(note, /RL investor pricing: 10% off at 5 to 9 units/);
});

test('no output string mentions a plan', () => {
  const inputs = [base, { ...base, units: 7 }, { ...base, units: 25, entities: 3 }, { ...base, units: 45 },
    { ...base, hoursPerUnit: 0, vacantDays: 0 }, {}];
  const text = [];
  for (const inp of inputs) {
    const r = calculate(inp, cfg);
    text.push(headline(r, cfg), stickyLine(r, cfg));
    for (const row of m.breakdown(r, cfg)) text.push(row.label, row.note);
  }
  const all = text.join(' | ');
  assert.ok(!/\bplans?\b/i.test(all), all.match(/.{0,40}\bplans?\b.{0,40}/i)?.[0]);
  assert.ok(!/[\u2013\u2014]/.test(all), 'no dashes');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
