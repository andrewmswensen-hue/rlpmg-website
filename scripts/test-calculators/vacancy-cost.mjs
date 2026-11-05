/**
 * Tests for src/lib/calculators/vacancyCost.ts.
 *
 *   node scripts/test-calculators/vacancy-cost.mjs      (run from site/)
 *
 * esbuild compiles the TypeScript module in memory, then the checks run with
 * node:assert. No test framework, no files written.
 */
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../../src/lib/calculators/vacancyCost.ts', import.meta.url));
const out = await build({ entryPoints: [entry], bundle: true, format: 'esm', write: false, platform: 'neutral' });
const mod = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const { vacancyCost, compareManagers, parseAmount, clampDays, lostRent, DAYS_IN_MONTH, MAX_DAYS } = mod;

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log(`ok    ${name}`); };
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

t('30-day month convention', () => assert.equal(DAYS_IN_MONTH, 30));

t('lost rent is rent / 30 times days', () => {
  near(lostRent(1500, 30), 1500);
  near(lostRent(1708, 32), (1708 / 30) * 32);
  assert.equal(Math.round(lostRent(1708, 32)), 1822);
});

t('total adds the four lines', () => {
  const r = vacancyCost({ monthlyRent: 1800, daysVacant: 30, monthlyVacantCosts: 150, turnCost: 1500, leasingCost: 900 });
  near(r.lostRent, 1800);
  near(r.vacantCosts, 150);
  assert.equal(r.turnCost, 1500);
  assert.equal(r.leasingCost, 900);
  near(r.total, 1800 + 150 + 1500 + 900);
  near(r.perDay, (1800 + 150) / 30);
  near(r.shareOfYearRent, 4350 / (1800 * 12));
});

t('mortgage, taxes and insurance do not change the total, only out of pocket', () => {
  const base = { monthlyRent: 1800, daysVacant: 45, monthlyVacantCosts: 150, turnCost: 1500, leasingCost: 0 };
  const a = vacancyCost(base);
  const b = vacancyCost({ ...base, monthlyFixedCosts: 1200 });
  near(a.total, b.total);
  near(b.outOfPocket - a.outOfPocket, 1200 * 1.5);
  near(a.outOfPocket, 150 * 1.5 + 1500);
});

t('zero days means only the one-time costs', () => {
  const r = vacancyCost({ monthlyRent: 2000, daysVacant: 0, monthlyVacantCosts: 200, turnCost: 700, leasingCost: 100 });
  near(r.total, 800);
  near(r.lostRent, 0);
});

t('zero rent gives no share of a year', () => {
  const r = vacancyCost({ monthlyRent: 0, daysVacant: 10, monthlyVacantCosts: 0, turnCost: 0, leasingCost: 0 });
  assert.equal(r.shareOfYearRent, null);
  assert.equal(r.total, 0);
});

t('bad and negative inputs read as zero', () => {
  const r = vacancyCost({ monthlyRent: NaN, daysVacant: -4, monthlyVacantCosts: -100, turnCost: Infinity, leasingCost: undefined });
  assert.equal(r.total, 0);
  assert.equal(r.days, 0);
});

t('days are whole and capped', () => {
  assert.equal(clampDays(12.6), 13);
  assert.equal(clampDays(5000), MAX_DAYS);
  assert.equal(clampDays('abc'), 0);
});

t('parseAmount reads what people type', () => {
  assert.equal(parseAmount('$1,708'), 1708);
  assert.equal(parseAmount(' 1708.50 '), 1708.5);
  assert.equal(parseAmount('32 days'), 32);
  assert.equal(parseAmount('50%'), 50);
  assert.equal(parseAmount(''), 0);
  assert.equal(parseAmount('abc'), 0);
  assert.equal(parseAmount('-5'), 0);
  assert.equal(parseAmount(null), 0);
  assert.equal(parseAmount('1.2.3'), 1.23);
});

t('compare: only days on market and leasing differ', () => {
  const c = compareManagers({
    monthlyRent: 1800, monthlyVacantCosts: 150, turnCost: 1500, turnDays: 12,
    otherDaysOnMarket: 30, otherLeasingPct: 50, rlDaysOnMarket: 20, rlLeasingFee: 0,
  });
  assert.equal(c.other.days, 42);
  assert.equal(c.rl.days, 32);
  near(c.other.leasingCost, 900);
  assert.equal(c.rl.leasingCost, 0);
  // 10 extra days at (1800 + 150) / 30 a day, plus the 900 leasing charge.
  near(c.difference, 10 * (1950 / 30) + 900);
});

t('compare: difference can be negative and is reported honestly', () => {
  const c = compareManagers({
    monthlyRent: 1500, monthlyVacantCosts: 0, turnCost: 0, turnDays: 10,
    otherDaysOnMarket: 5, otherLeasingPct: 0, rlDaysOnMarket: 20, rlLeasingFee: 0,
  });
  assert.ok(c.difference < 0);
  near(c.difference, -15 * 50);
});

console.log(`\nvacancy-cost: ${passed} tests passed`);
