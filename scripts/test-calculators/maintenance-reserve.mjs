/**
 * Tests for src/lib/calculators/maintenanceReserve.ts.
 *
 *   node scripts/test-calculators/maintenance-reserve.mjs
 *
 * esbuild bundles the TypeScript module (and src/data/facts.ts, for the check
 * that the page's real RLPM rates flow through) into a temporary .mjs file,
 * which is then imported and exercised with node:assert. No test framework.
 */
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = await mkdtemp(join(tmpdir(), 'mr-test-'));
const out = join(dir, 'bundle.mjs');

await build({
  stdin: {
    contents: `export * from './src/lib/calculators/maintenanceReserve.ts';
               export { pricing } from './src/data/facts.ts';
               export { rentByBedroom } from './src/data/markets.ts';`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
});
const mr = await import(pathToFileURL(out).href);
await rm(dir, { recursive: true, force: true });

const { calculateReserve, defaultInputs, exampleItems, money } = mr;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message.split('\n').join('\n      ')}`); }
}
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, `${msg ?? ''} expected ${b}, got ${a}`);

/** Fixed rates so the arithmetic tests do not move when facts.ts changes. */
const RATES = { hourly: 84, tripCharge: 15, accountReserveMin: 350, accountReserveMax: 1500 };

test('defaults: cash reserve is six months of rent', () => {
  const r = calculateReserve(defaultInputs(1708), RATES);
  near(r.perUnit.cashReserve, 6 * 1708);
  near(r.perUnit.dueNow, 0);
  near(r.perUnit.reserve, 10248);
  near(r.total.reserve, 10248);
});

test('defaults: capital set-aside matches the 2025 blog example plus appliances', () => {
  const r = calculateReserve(defaultInputs(1708), RATES);
  const expected = 10000 / 240 + 8000 / 180 + 1200 / 120 + 1200 / 120 + 4000 / 96;
  near(r.perUnit.capitalMonthly, expected);
  // The blog post's own four items come to about $1,653 a year.
  const blogFour = r.items.filter((i) => i.id !== 'appliances').reduce((s, i) => s + i.monthly, 0) * 12;
  near(blogFour, 500 + 8000 / 15 + 120 + 500);
});

test('defaults: routine repair float uses the page method (2 hours, 2 repairs)', () => {
  const r = calculateReserve(defaultInputs(1708), RATES);
  near(r.perUnit.routineRepair, 2 * 84 + 15);
  near(r.perUnit.float, 366);
  near(r.perUnit.floatRefillMonthly, 30.5);
  near(r.perUnit.monthly, r.perUnit.capitalMonthly + 30.5);
  assert.equal(money(r.perUnit.monthly), '$178');
});

test('units multiply every total, not the per-unit figures', () => {
  const r = calculateReserve({ ...defaultInputs(1500), units: 4 }, RATES);
  assert.equal(r.units, 4);
  near(r.total.reserve, 4 * 6 * 1500);
  near(r.total.monthly, 4 * r.perUnit.monthly);
  near(r.total.accountReserveMin, 1400);
  near(r.total.accountReserveMax, 6000);
  near(r.perUnit.cashReserve, 9000);
});

test('an item at or past its expected life is due now: added to the reserve, no monthly', () => {
  const items = exampleItems();
  items[0].age = 22;           // roof, 20-year life
  items[3].age = 10;           // appliances, exactly at life
  const r = calculateReserve({ ...defaultInputs(1000), items }, RATES);
  const roof = r.items.find((i) => i.id === 'roof');
  assert.equal(roof.dueNow, true);
  assert.equal(roof.yearsLeft, 0);
  assert.equal(roof.monthly, 0);
  assert.equal(r.items.find((i) => i.id === 'appliances').dueNow, true);
  near(r.perUnit.dueNow, 11200);
  near(r.perUnit.reserve, 6000 + 11200);
});

test('fewer years left means a larger monthly set-aside', () => {
  const items = exampleItems();
  items[1].age = 12;           // HVAC, 15-year life, 3 years left
  const r = calculateReserve({ ...defaultInputs(1708), items }, RATES);
  near(r.items.find((i) => i.id === 'hvac').monthly, 8000 / 36);
});

test('a zero-cost item is left out entirely', () => {
  const items = exampleItems().map((i) => ({ ...i, cost: i.id === 'flooring' ? 0 : i.cost }));
  const r = calculateReserve({ ...defaultInputs(1708), items }, RATES);
  assert.equal(r.items.some((i) => i.id === 'flooring'), false);
  assert.equal(r.items.length, 4);
});

test('blank, negative and non-numeric inputs are treated as zero, units as at least 1', () => {
  const r = calculateReserve({
    units: NaN, rent: -500, monthsOfRent: NaN, repairHours: -1, repairsCovered: NaN,
    items: [{ id: 'x', label: 'X', cost: NaN, age: 1, life: 5 }],
  }, RATES);
  assert.equal(r.units, 1);
  near(r.total.reserve, 0);
  near(r.perUnit.routineRepair, 15); // trip charge only
  near(r.perUnit.float, 0);
  assert.equal(r.items.length, 0);
  assert.equal(r.largest, null);
  assert.equal(r.coversLargest, true);
  assert.equal(r.monthlyPctOfRent, null);
});

test('fractional units round down', () => {
  assert.equal(calculateReserve({ ...defaultInputs(1000), units: 2.7 }, RATES).units, 2);
});

test('largest item check', () => {
  const r = calculateReserve({ ...defaultInputs(1000), monthsOfRent: 3 }, RATES);
  assert.equal(r.largest.id, 'roof');
  assert.equal(r.coversLargest, false);  // $3,000 does not cover a $10,000 roof
  const r2 = calculateReserve({ ...defaultInputs(1708) }, RATES);
  assert.equal(r2.coversLargest, true);  // $10,248 covers it
});

test('largest item check skips items already due now', () => {
  const items = exampleItems();
  items[0].age = 25;                     // roof due now, already in the reserve
  const r = calculateReserve({ ...defaultInputs(1000), items, monthsOfRent: 6 }, RATES);
  assert.equal(r.largest.id, 'hvac');    // next biggest exposure
  assert.equal(r.coversLargest, false);  // $6,000 cash does not cover an $8,000 HVAC
  const t = mr.resultText({ ...defaultInputs(1000), items, monthsOfRent: 6 }, r);
  assert.match(t.check, /\$2,000 short of your largest remaining item \(HVAC, \$8,000\)/);
  const all = exampleItems().map((i) => ({ ...i, age: 99 }));
  const r3 = calculateReserve({ ...defaultInputs(1000), items: all }, RATES);
  assert.equal(r3.largest, null);
  assert.equal(r3.coversLargest, true);
  assert.match(mr.resultText({ ...defaultInputs(1000), items: all }, r3).check, /already counted/);
});

test('resultText: example wording, and a key for every item row', () => {
  const inp = defaultInputs(1708);
  const t = mr.resultText(inp, calculateReserve(inp, RATES));
  assert.equal(t.reserve, '$10,248');
  assert.equal(t['reserve-sub'], 'For one unit');
  assert.equal(t.monthly, '$178');
  assert.equal(t.summary, 'Hold $10,248 in reserve and set aside $178 a month.');
  assert.equal(t['item-roof-left'], '20 years left');
  assert.equal(t['item-roof-monthly'], '$42 a month');
  for (const it of inp.items) assert.ok(t[`item-${it.id}-left`] && t[`item-${it.id}-monthly`]);
  const t4 = mr.resultText({ ...inp, units: 4 }, calculateReserve({ ...inp, units: 4 }, RATES));
  assert.equal(t4['reserve-sub'], '$10,248 per unit across 4 units');
  assert.equal(t4['item-roof-monthly'], '$167 a month');
});

test('monthly set-aside as a percent of rent', () => {
  const r = calculateReserve(defaultInputs(2000), RATES);
  near(r.monthlyPctOfRent, (r.perUnit.monthly / 2000) * 100);
});

test('the page wiring: RLPM rates from facts.ts give the page\'s published repair cost', () => {
  const m = mr.pricing.maintenance;
  const rates = {
    hourly: m.inHouseHourly, tripCharge: m.tripCharge,
    accountReserveMin: mr.pricing.reserves.min, accountReserveMax: mr.pricing.reserves.max,
  };
  const r = calculateReserve(defaultInputs(mr.rentByBedroom['3'].median), rates);
  near(r.perUnit.routineRepair, m.inHouseHourly * 2 + m.tripCharge);
  near(r.total.accountReserveMin, mr.pricing.reserves.min);
  assert.ok(r.total.reserve > 0 && r.total.monthly > 0);
});

test('sticky bar line: reserve and monthly set-aside', () => {
  const inp = defaultInputs(mr.rentByBedroom['3'].median);
  const r = calculateReserve(inp, RATES);
  assert.equal(mr.stickyLine(r), `Hold ${money(r.total.reserve)}, set aside ${money(r.total.monthly)} a month`);
});

test('no output string mentions a plan', () => {
  const texts = [];
  for (const inp of [defaultInputs(1805), { ...defaultInputs(1805), units: 4 }, { ...defaultInputs(900), monthsOfRent: 0 }]) {
    const r = calculateReserve(inp, RATES);
    texts.push(mr.stickyLine(r), ...Object.values(mr.resultText(inp, r)));
  }
  const all = texts.join(' | ');
  assert.ok(!/\bplans?\b/i.test(all), all.match(/.{0,40}\bplans?\b.{0,40}/i)?.[0]);
});

test('money() formats whole dollars like usd() in facts.ts', () => {
  assert.equal(money(10248), '$10,248');
  assert.equal(money(178.28), '$178');
  assert.equal(money(0), '$0');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
