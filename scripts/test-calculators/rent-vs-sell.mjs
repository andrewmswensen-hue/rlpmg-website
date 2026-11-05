/**
 * Tests for src/lib/calculators/rentVsSell.ts.
 *
 *   node scripts/test-calculators/rent-vs-sell.mjs      (run from site/)
 *
 * The first 40 checks are ported unchanged from Andrew's standalone calculator
 * (Projects/RLPM-Rent-vs-Sell-Calculator/test-engine.js), so the site version is
 * held to the same hand-checked numbers. The rest cover what the site adds: the
 * flat monthly management price from facts.ts, and the text/chart helpers.
 *
 * esbuild (already a dependency of Astro) bundles the TypeScript module in
 * memory, so there is no build step and nothing is written to disk.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, '../../src/lib/calculators/rentVsSell.ts');
const out = await build({ entryPoints: [entry], bundle: true, format: 'esm', write: false, platform: 'node', logLevel: 'error' });
const RVS = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const { pricing } = await import('data:text/javascript;base64,' + Buffer.from(
  (await build({ entryPoints: [resolve(here, '../../src/data/facts.ts')], bundle: true, format: 'esm', write: false, logLevel: 'error' })).outputFiles[0].text,
).toString('base64'));

let pass = 0, fail = 0;
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
function ok(name, cond, got, want) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + '   got=' + got + ' want=' + want); }
}

const base = {
  homeValue: 450000, pricePaid: 300000, capitalImprovements: 0,
  mortgageBalance: 200000, interestRate: 5, remainingTermYears: 25,
  monthlyRent: 2500, rentGrowth: 3, vacancyRate: 8,
  propertyTaxMode: 'percent', propertyTaxRate: 1.6, propertyTaxMonthly: 600,
  insuranceMonthly: 115, landlordInsBump: 20, hoaMonthly: 0,
  pmRate: 8, leasingRate: 4, maintenanceRate: 1, capexRate: 1,
  appreciationRate: 3.5, expenseInflation: 3, yearsToHold: 10,
  isPrimaryResidence: true, yearsLivedIn: 5, marriedFilingJointly: true,
  makeReadyCosts: 3000, refurbToSell: 0,
  realtorCommission: 6, closingCosts: 3,
  incomeTaxRate: 24, capGainsRate: 15, recaptureRate: 25,
  landPct: 20, reinvestmentRate: 6,
};

console.log('\n--- MORTGAGE MATH ---');
ok('P&I on 200k @5% / 25yr = 1169.18', near(RVS.pmt(200000, 5, 300), 1169.18, 0.02), RVS.pmt(200000, 5, 300).toFixed(2), '1169.18');
ok('P&I on 250k @5% / 30yr = 1342.05', near(RVS.pmt(250000, 5, 360), 1342.05, 0.02), RVS.pmt(250000, 5, 360).toFixed(2), '1342.05');
ok('0% loan 120k/360mo = 333.33', near(RVS.pmt(120000, 0, 360), 333.33, 0.02), RVS.pmt(120000, 0, 360).toFixed(2), '333.33');
ok('zero balance -> 0 payment', RVS.pmt(0, 5, 360) === 0, RVS.pmt(0, 5, 360), '0');

let b = 200000; const r = 5 / 100 / 12, p = RVS.pmt(200000, 5, 300); let int1 = 0;
for (let i = 0; i < 12; i++) { const ii = b * r; int1 += ii; b -= (p - ii); }
const sch = RVS.amortize(200000, 5, 300, 10);
ok('Yr1 interest matches independent loop', near(sch[1].interest, int1, 0.01), sch[1].interest.toFixed(2), int1.toFixed(2));
ok('Yr1 ending balance matches loop', near(sch[1].balance, b, 0.01), sch[1].balance.toFixed(2), b.toFixed(2));
ok('Balance you typed in IS the year-0 balance', sch[0].balance === 200000, sch[0].balance, 200000);

console.log('\n--- BUG #2 REGRESSION: payments must stop at payoff ---');
const short = RVS.amortize(200000, 5, 60, 10);
ok('loan paid off by yr 5', short[5].balance < 1, short[5].balance.toFixed(2), '0');
ok('no payments charged in yr 6', short[6].paid === 0, short[6].paid, '0');
ok('no payments charged in yr 10', short[10].paid === 0, short[10].paid, '0');

console.log('\n--- SELL NOW ---');
const R = RVS.model(base);
ok('sell-now gain = 109,500', near(R.sellNow.gain, 109500), R.sellNow.gain.toFixed(0), '109500');
ok('sell-now tax = 0 (121 exclusion)', R.sellNow.tax === 0, R.sellNow.tax, '0');
ok('sell-now net = 209,500', near(R.sellNow.net, 209500), R.sellNow.net.toFixed(0), '209500');
const inv = RVS.model({ ...base, isPrimaryResidence: false });
ok('investment prop sell-now tax = 16,425', near(inv.sellNow.tax, 16425), inv.sellNow.tax.toFixed(0), '16425');

console.log('\n--- DEPRECIATION ---');
ok('annual depreciation = 8,727', near(R.annualDep, 8727.27, 0.5), R.annualDep.toFixed(2), '8727.27');
ok('accum dep yr10 = 87,273', near(R.rows[9].accumDep, 87272.7, 1), R.rows[9].accumDep.toFixed(0), '87273');
const dep40 = RVS.model({ ...base, yearsToHold: 30 });
ok('depreciation stops at 27.5 yrs', near(dep40.rows[29].accumDep, 240000, 1), dep40.rows[29].accumDep.toFixed(0), '240000');
ok('yr 29 dep = 0 (fully depreciated)', dep40.rows[28].depreciation === 0, dep40.rows[28].depreciation, '0');

console.log('\n--- BUG #4 REGRESSION: 121 exclusion must expire ---');
ok('yr 1 sale: exclusion applies', R.rows[0].exclusionUsed > 0, R.rows[0].exclusionUsed.toFixed(0), '>0');
ok('yr 3 sale: exclusion applies', R.rows[2].exclusionUsed > 0, R.rows[2].exclusionUsed.toFixed(0), '>0');
ok('yr 4 sale: exclusion GONE', R.rows[3].exclusionUsed === 0, R.rows[3].exclusionUsed, '0');
ok('yr 10 sale: exclusion GONE', R.rows[9].exclusionUsed === 0, R.rows[9].exclusionUsed, '0');
ok('recapture taxed even in yr 1', R.rows[0].recaptureTax > 0, R.rows[0].recaptureTax.toFixed(0), '>0');

console.log('\n--- BUG #3 REGRESSION: no silent halving ---');
const avg1 = 450000 * Math.pow(1.035, 0.5) * 0.01;
ok('maintenance = full 1% of value', near(R.rows[0].breakdown.maintenance, avg1, 1), R.rows[0].breakdown.maintenance.toFixed(0), avg1.toFixed(0));
ok('capex = full 1% of value', near(R.rows[0].breakdown.capex, avg1, 1), R.rows[0].breakdown.capex.toFixed(0), 'same');

console.log('\n--- BUG #1 REGRESSION: selling costs charged every year, not just the last ---');
const A = RVS.model({ ...base, yearsToHold: 10 });
const B = RVS.model({ ...base, yearsToHold: 20 });
let stable = true;
for (let i = 0; i < 10; i++) if (Math.abs(A.rows[i].wealthRent - B.rows[i].wealthRent) > 0.01) stable = false;
ok('yrs 1-10 identical whether you model 10 or 20 years', stable, 'shifted', 'stable');
ok('every year carries its own selling costs', R.rows.every((x) => x.sellingCosts > 0), 'some zero', 'all > 0');
const smooth = RVS.model({ ...base, isPrimaryResidence: false });
let mono = true;
for (let i = 1; i < smooth.rows.length; i++) if (smooth.rows[i].wealthRent < smooth.rows[i - 1].wealthRent) mono = false;
ok('investment property curve rises smoothly', mono, 'dips', 'monotonic');
ok('primary residence dips at yr 4 (real 121 cliff)',
  R.rows[3].wealthRent < R.rows[2].wealthRent && R.rows[3].capGainsTax > 0, R.rows[3].capGainsTax.toFixed(0), 'tax appears');

console.log('\n--- SYMMETRY / SANITY ---');
ok('sell-now line compounds at 6%', near(R.rows[9].wealthSell, 209500 * Math.pow(1.06, 10), 1),
  R.rows[9].wealthSell.toFixed(0), (209500 * Math.pow(1.06, 10)).toFixed(0));
ok('house value yr10 = 450k*1.035^10', near(R.rows[9].houseValue, 450000 * Math.pow(1.035, 10), 1),
  R.rows[9].houseValue.toFixed(0), (450000 * Math.pow(1.035, 10)).toFixed(0));
ok('yr1 rent = current rent (no phantom growth)', near(R.rows[0].grossRent, 30000), R.rows[0].grossRent.toFixed(0), '30000');
ok('collected = gross less 8% vacancy', near(R.rows[0].collectedRent, 27600), R.rows[0].collectedRent.toFixed(0), '27600');

console.log('\n--- EDGE CASES ---');
const paidOff = RVS.model({ ...base, mortgageBalance: 0, interestRate: 0, remainingTermYears: 0 });
ok('paid-off: no mortgage cost', paidOff.rows[0].mortgagePaid === 0, paidOff.rows[0].mortgagePaid, '0');
ok('paid-off: positive cash flow', paidOff.rows[0].netCashFlow > 0, paidOff.rows[0].netCashFlow.toFixed(0), '>0');
const uw = RVS.model({ ...base, homeValue: 180000, mortgageBalance: 200000, pricePaid: 220000 });
ok('underwater: sell-now net is negative', uw.sellNow.net < 0, uw.sellNow.net.toFixed(0), '<0');
ok('underwater: no capital gains tax on a loss', uw.sellNow.tax === 0, uw.sellNow.tax, '0');
const one = RVS.model({ ...base, yearsToHold: 1 });
ok('1-year hold works', one.rows.length === 1, one.rows.length, '1');
const zeroRent = RVS.model({ ...base, monthlyRent: 0 });
ok('zero rent -> negative cash flow, no crash', zeroRent.rows[0].netCashFlow < 0, zeroRent.rows[0].netCashFlow.toFixed(0), '<0');
ok('no NaN anywhere in default model',
  JSON.stringify(R.rows).indexOf('null') === -1 && !JSON.stringify(R.rows).match(/NaN/), 'clean', 'clean');

/* ===================== Site additions ===================== */

console.log('\n--- FLAT MANAGEMENT PRICE (site addition) ---');
const flat = RVS.model({ ...base, pmMode: 'flat', pmMonthly: 137 });
ok('flat price: year 1 management = 137 x 12', near(flat.rows[0].breakdown.management, 1644, 0.01), flat.rows[0].breakdown.management.toFixed(2), '1644');
ok('flat price: rises with expense inflation in yr 2', near(flat.rows[1].breakdown.management, 1644 * 1.03, 0.01),
  flat.rows[1].breakdown.management.toFixed(2), (1644 * 1.03).toFixed(2));
ok('pmMode missing = percent of collected rent (original model)', near(R.rows[0].breakdown.management, 27600 * 0.08, 0.01),
  R.rows[0].breakdown.management.toFixed(2), '2208');
ok('flat price leaves sell-now untouched', flat.sellNow.net === R.sellNow.net, flat.sellNow.net, R.sellNow.net);
const selfM = RVS.model({ ...base, pmMode: 'flat', pmMonthly: 0 });
ok('self-managed: zero management cost', selfM.rows.every((x) => x.breakdown.management === 0), 'nonzero', '0');
ok('lossBenefit reconciles netProceeds', R.rows.every((x) => near(x.netProceeds,
  x.houseValue - x.sellingCosts - x.mortgageBalance - x.recaptureTax - x.capGainsTax + x.lossBenefit, 0.01)), 'mismatch', 'match');

console.log('\n--- DEFAULTS AND FACTS ---');
ok('default management is RL Property Management', RVS.DEFAULTS.management === 'rl', RVS.DEFAULTS.management, 'rl');
ok('RL price is the $137 standard price from facts.ts', RVS.RL_MONTHLY === pricing.plans[1].monthly && RVS.RL_MONTHLY === 137,
  RVS.RL_MONTHLY, pricing.plans[1].monthly);
const rlOpt = RVS.MANAGEMENT_OPTIONS.find((o) => o.value === 'rl');
ok('RL option carries the facts.ts price', rlOpt && rlOpt.mode === 'flat' && rlOpt.monthly === pricing.plans[1].monthly, rlOpt?.monthly, pricing.plans[1].monthly);
ok('three management options: RL, another manager, self',
  RVS.MANAGEMENT_OPTIONS.map((o) => o.value).join(',') === 'rl,percent,self', RVS.MANAGEMENT_OPTIONS.map((o) => o.value).join(','), 'rl,percent,self');
ok('old share links: every plan id maps to RL', ['plan-one', 'plan-two', 'plan-three'].every((v) => RVS.normalizeManagement(v) === 'rl'), 'not rl', 'rl');
ok('unknown management value falls back to RL', RVS.normalizeManagement('nope') === 'rl' && RVS.normalizeManagement(undefined) === 'rl', 'other', 'rl');
ok('current values pass through', RVS.normalizeManagement('percent') === 'percent' && RVS.normalizeManagement('self') === 'self', 'changed', 'unchanged');
const oldLink = RVS.model(RVS.toInputs({ ...RVS.DEFAULTS, management: 'plan-three' }));
ok('old plan-three link prices management at the RL price', near(oldLink.rows[0].breakdown.management, RVS.RL_MONTHLY * 12, 0.01),
  oldLink.rows[0].breakdown.management.toFixed(0), RVS.RL_MONTHLY * 12);
const D = RVS.model(RVS.toInputs(RVS.DEFAULTS));
ok('defaults: year 1 management = RL price x 12', near(D.rows[0].breakdown.management, RVS.RL_MONTHLY * 12, 0.01),
  D.rows[0].breakdown.management.toFixed(0), RVS.RL_MONTHLY * 12);
ok('defaults: same honest home (285k value, 2,050 rent, 150k owed)',
  RVS.DEFAULTS.homeValue === 285000 && RVS.DEFAULTS.monthlyRent === 2050 && RVS.DEFAULTS.mortgageBalance === 150000, 'changed', 'unchanged');
ok('defaults: no NaN', !JSON.stringify(D).match(/NaN|null/), 'NaN', 'clean');
console.log(`        (defaults: ${D.summary.favors} ahead by ${RVS.money(Math.abs(D.summary.difference))} over ${D.summary.years} years, ` +
  `year-one cash flow ${RVS.money(D.summary.monthlyCashFlowY1)}/mo, sell today ${RVS.money(D.sellNow.net)})`);

console.log('\n--- WORDS AND CHART ---');
const dashes = /[\u2013\u2014]|&(m|n)dash;/;
const S = RVS.DEFAULTS;
const v = RVS.verdict(D, S);
const allText = [v.plain, v.note, RVS.scenarioLine(S), RVS.chartCaption(D.rows), RVS.breakdownHtml(D, S),
  RVS.tableRowsHtml(D.rows), RVS.chartSvg(D.rows, 640), RVS.chartSvg(D.rows, 320),
  ...RVS.stats(D).flatMap((s) => [s.label, s.value, s.sub]), ...Object.values(RVS.hints(S, D)),
  RVS.stickyLine(D), ...RVS.MANAGEMENT_OPTIONS.map((o) => o.label),
  ...['percent', 'self'].map((m) => Object.values(RVS.hints({ ...S, management: m }, D)).join(' '))].join(' ');
ok('no em or en dashes in any generated text', !dashes.test(allText), allText.match(dashes)?.[0], 'none');
ok('no NaN or undefined in generated text', !/NaN|undefined|Infinity/.test(allText), 'found', 'none');
ok('no output string mentions a plan', !/\bplans?\b/i.test(allText), allText.match(/.{0,30}\bplans?\b.{0,30}/i)?.[0], 'none');
ok('sticky line: renting case', RVS.stickyLine(D) === `Renting comes out ahead by ${RVS.money(Math.abs(D.summary.difference))} over ${D.summary.years} years`,
  RVS.stickyLine(D), 'Renting comes out ahead by ...');
ok('sticky line: selling case', RVS.stickyLine(RVS.model({ ...base, monthlyRent: 1200 })).startsWith('Selling now comes out ahead by'),
  RVS.stickyLine(RVS.model({ ...base, monthlyRent: 1200 })), 'Selling now ...');
ok('verdict names the winning side', /^(Renting|Selling)/.test(v.plain), v.plain, 'Renting/Selling ...');
ok('money() uses a true minus sign', RVS.money(-1234.4) === '−$1,234', RVS.money(-1234.4), '−$1,234');
ok('parseNum strips commas and $', RVS.parseNum('$285,000') === 285000, RVS.parseNum('$285,000'), 285000);
ok('table has one row per year', (RVS.tableRowsHtml(D.rows).match(/<tr>/g) || []).length === D.rows.length, 'mismatch', D.rows.length);
const svgOne = RVS.chartSvg(RVS.model({ ...base, yearsToHold: 1 }).rows, 320);
ok('chart draws a 1-year hold without NaN', !/NaN/.test(svgOne), 'NaN', 'clean');
ok('chart is labelled for screen readers', /role="img" aria-label="Projected wealth/.test(RVS.chartSvg(D.rows)), 'missing', 'present');
ok('cliff caption appears for a primary residence', /step down in year 4/.test(RVS.chartCaption(D.rows)), RVS.chartCaption(D.rows), 'year 4');
ok('selling-wins case reads correctly',
  RVS.verdict(RVS.model({ ...base, monthlyRent: 1200 }), { ...S, ...base, monthlyRent: 1200 }).plain.startsWith('Selling now'),
  'wrong side', 'Selling now ...');

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED' : pass + ' passed, ' + fail + ' FAILED') + '\n');
process.exit(fail ? 1 : 0);
