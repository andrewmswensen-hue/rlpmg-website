/**
 * Self-management cost calculator: the arithmetic, and nothing else.
 *
 * Pure functions, no DOM, no network. Used three ways:
 *   1. At build time by src/pages/self-management-calculator/index.astro, to
 *      render the worked example into the HTML (what readers without
 *      JavaScript, search engines and answer engines see).
 *   2. In the browser, by that page's processed <script>, to make it live.
 *   3. By scripts/test-calculators/self-management.mjs.
 *
 * Every RLPM price comes in through `buildConfig(pricing, company)`, which reads
 * the fact bank in src/data/facts.ts. Nothing here hard-codes an RLPM price.
 *
 * Andrew 2026-11-05: the calculators compare against one RL price and never name
 * a plan. That price is pricing.plans[1].monthly, the $137 standard price. The
 * published investor tiers still apply to it from 5 units, described as "RL
 * investor pricing".
 *
 * The model, line by line (all per year):
 *
 * SELF-MANAGING (costs you carry because you self-manage)
 *   time        hours per unit per month x units x value of an hour x 12
 *   vacancy     days empty last year (all units) x (rent / 30) x share a manager would save
 *   repairs     repair spend per unit x units x share of it that is retail markup
 *   other       software, bookkeeping, legal help, listing costs, paid help (as entered)
 *
 * MANAGEMENT (costs you take on if you hire us)
 *   monthly     RL price per unit, after any published investor discount, x units x 12
 *   renewals    units x share of leases that renew x the lease renewal fee
 *   leasing     units x share of leases that turn over x the leasing fee ($0)
 *   projectMgmt managed repair spend x the vendor project management percentage.
 *               A ceiling: the real charge is capped per project and does not
 *               apply to in-house work, so this overstates it.
 *   techFee     ownership entities x the annual technology and accounting fee
 *
 * Every line is rounded to whole dollars, and totals are sums of the rounded
 * lines, so the numbers on the page always add up by hand.
 *
 * The two "share" inputs (vacancy saved, repair markup) are assumptions, not
 * measured facts. Their starting values (50% and 20%) are carried over from the
 * calculator on the old rlpmg.com, and the page labels them as editable.
 */

export interface TierConfig {
  min: number;
  max: number;
  pct: number;
  label: string;
}

export interface SelfManagementConfig {
  /** Company name as shown on the page, e.g. "RL Property Management". */
  name: string;
  /** Short name for tight spaces, e.g. "RLPM". */
  shortName: string;
  /** Standard RL monthly price per unit, before any investor discount. */
  monthly: number;
  leasingFee: number;
  leaseRenewalFee: number;
  /** Investor tiers. Below the first tier's `min`, standard pricing applies. */
  tiers: TierConfig[];
  /** Unit count at which pricing becomes custom. */
  customFrom: number;
  /** Vendor project management percentage (15 means 15%). */
  vendorProjectFeePct: number;
  /** Annual technology and accounting fee, per business entity. */
  techFeePerEntity: number;
}

export interface SelfManagementInputs {
  units: number;
  rent: number;
  hoursPerUnit: number;
  hourlyValue: number;
  vacantDays: number;
  vacancySavedPct: number;
  repairsPerUnit: number;
  repairMarkupPct: number;
  software: number;
  bookkeeping: number;
  legal: number;
  marketing: number;
  otherCosts: number;
  renewalPct: number;
  entities: number;
}

export interface Line {
  id: string;
  amount: number;
}

export interface RlPrice {
  /** Standard monthly price per unit, before any discount. */
  standardMonthly: number;
  /** Monthly price per unit after any investor discount, whole dollars. */
  perUnitMonthly: number;
  /** Discount applied, as a percentage. 0 for standard pricing. */
  discountPct: number;
  /** Label of the investor tier used, or null for standard pricing. */
  tierLabel: string | null;
  /** True at or above `customFrom`: the price shown is an estimate. */
  custom: boolean;
}

export interface SelfManagementResult {
  inputs: SelfManagementInputs;
  price: RlPrice;
  self: { time: number; vacancy: number; repairs: number; other: number; total: number };
  managed: {
    monthly: number; renewals: number; leasing: number;
    projectMgmt: number; techFee: number; total: number;
  };
  /** Self total minus management total. Positive means management costs less. */
  difference: number;
  perUnitMonthly: { self: number; managed: number };
  /** Counts behind the renewal and leasing lines, for the explanation text. */
  renewalsPerYear: number;
  turnoversPerYear: number;
}

/** Inputs that must be whole numbers of at least 1. */
const MIN_ONE = new Set<keyof SelfManagementInputs>(['units', 'entities']);
/** Inputs that are percentages, clamped to 0 to 100. */
const PERCENT = new Set<keyof SelfManagementInputs>(['vacancySavedPct', 'repairMarkupPct', 'renewalPct']);

/** A finite, non-negative number, or the fallback. Accepts strings from form fields. */
export function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'string' && v.trim() === '') return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,%\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Clean up raw inputs: blanks and junk become 0 (or 1 for units and entities),
 * percentages are capped at 100, unit and entity counts are whole numbers, and
 * vacant days cannot exceed 365 per unit.
 */
export function normalizeInputs(
  raw: Partial<Record<keyof SelfManagementInputs, unknown>>,
  cfg: SelfManagementConfig,
): SelfManagementInputs {
  const num = (k: keyof SelfManagementInputs) => {
    let n = toNumber(raw[k], MIN_ONE.has(k) ? 1 : 0);
    if (MIN_ONE.has(k)) n = Math.max(1, Math.floor(n));
    if (PERCENT.has(k)) n = Math.min(100, n);
    return n;
  };
  const units = num('units');
  return {
    units,
    rent: num('rent'),
    hoursPerUnit: num('hoursPerUnit'),
    hourlyValue: num('hourlyValue'),
    vacantDays: Math.min(num('vacantDays'), 365 * units),
    vacancySavedPct: num('vacancySavedPct'),
    repairsPerUnit: num('repairsPerUnit'),
    repairMarkupPct: num('repairMarkupPct'),
    software: num('software'),
    bookkeeping: num('bookkeeping'),
    legal: num('legal'),
    marketing: num('marketing'),
    otherCosts: num('otherCosts'),
    renewalPct: num('renewalPct'),
    entities: num('entities'),
  };
}

/** Same rounding as tierPrice() in src/data/facts.ts, so prices match /pricing/. */
const discounted = (monthly: number, pct: number) => Math.round(monthly * (1 - pct / 100));

/**
 * RL monthly price per unit at a portfolio size, using the published investor
 * tiers. At `customFrom` and above pricing is custom, so this returns the
 * deepest published tier's price and flags it as an estimate.
 */
export function rlPrice(units: number, cfg: SelfManagementConfig): RlPrice {
  const custom = units >= cfg.customFrom;
  const tier = custom
    ? cfg.tiers[cfg.tiers.length - 1] ?? null
    : cfg.tiers.find((t) => units >= t.min && units <= t.max) ?? null;
  const pct = tier ? tier.pct : 0;
  return {
    standardMonthly: cfg.monthly,
    perUnitMonthly: discounted(cfg.monthly, pct),
    discountPct: pct,
    tierLabel: tier ? tier.label : null,
    custom,
  };
}

const r = Math.round;

export function calculate(
  raw: Partial<Record<keyof SelfManagementInputs, unknown>>,
  cfg: SelfManagementConfig,
): SelfManagementResult {
  const i = normalizeInputs(raw, cfg);
  const price = rlPrice(i.units, cfg);

  const repairSpend = i.repairsPerUnit * i.units;
  const markup = repairSpend * (i.repairMarkupPct / 100);

  const self = {
    time: r(i.hoursPerUnit * i.units * i.hourlyValue * 12),
    vacancy: r(i.vacantDays * (i.rent / 30) * (i.vacancySavedPct / 100)),
    repairs: r(markup),
    other: r(i.software + i.bookkeeping + i.legal + i.marketing + i.otherCosts),
    total: 0,
  };
  self.total = self.time + self.vacancy + self.repairs + self.other;

  const renewalsPerYear = i.units * (i.renewalPct / 100);
  const turnoversPerYear = i.units - renewalsPerYear;
  const managed = {
    monthly: price.perUnitMonthly * i.units * 12,
    renewals: r(renewalsPerYear * cfg.leaseRenewalFee),
    leasing: r(turnoversPerYear * cfg.leasingFee),
    projectMgmt: r((repairSpend - markup) * (cfg.vendorProjectFeePct / 100)),
    techFee: r(i.entities * cfg.techFeePerEntity),
    total: 0,
  };
  managed.total = managed.monthly + managed.renewals + managed.leasing + managed.projectMgmt + managed.techFee;

  return {
    inputs: i,
    price,
    self,
    managed,
    difference: self.total - managed.total,
    perUnitMonthly: {
      self: r(self.total / i.units / 12),
      managed: r(managed.total / i.units / 12),
    },
    renewalsPerYear,
    turnoversPerYear,
  };
}

/** Whole-dollar currency, matching usd() in src/data/facts.ts. */
export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

/** The one-sentence answer shown as the headline. */
export function headline(res: SelfManagementResult, cfg: SelfManagementConfig): string {
  const lead = `Self-managing costs you about ${money(res.self.total)} a year. ${cfg.name} would cost about ${money(res.managed.total)}.`;
  const d = res.difference;
  if (Math.abs(d) < 1) return `${lead} On these numbers the two come out about even.`;
  if (d > 0) return `${lead} Management comes out ${money(d)} a year ahead on these numbers.`;
  return `${lead} Self-managing comes out ${money(-d)} a year cheaper on these numbers, so keep doing it if they hold.`;
}

/** The short headline for the mobile sticky bar. Plain text, one or two lines on a phone. */
export function stickyLine(res: SelfManagementResult, cfg: SelfManagementConfig): string {
  const d = res.difference;
  if (Math.abs(d) < 1) return `Self-managing and ${cfg.shortName} cost about the same`;
  if (d > 0) return `Self-managing costs ${money(d)} more a year`;
  return `Self-managing saves you ${money(-d)} a year`;
}

export interface BreakdownRow {
  /** Stable id, used by the page to find the row in the DOM. */
  id: string;
  side: 'self' | 'managed';
  label: string;
  /** How the number was worked out, in words. */
  note: string;
  amount: number;
  total?: boolean;
}

const plain = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
const cents = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const unitsWord = (n: number) => `${plain(n)} ${n === 1 ? 'unit' : 'units'}`;

/**
 * The breakdown table, row by row, with the working shown. Shared by the
 * build-time worked example and the live script so the two cannot drift.
 */
export function breakdown(res: SelfManagementResult, cfg: SelfManagementConfig): BreakdownRow[] {
  const i = res.inputs;
  const p = res.price;
  const repairSpend = i.repairsPerUnit * i.units;
  const managedSpend = repairSpend * (1 - i.repairMarkupPct / 100);
  const priceNote = p.custom
    ? `, an estimate: pricing is custom from ${cfg.customFrom} units`
    : p.discountPct
      ? `, RL investor pricing: ${p.discountPct}% off at ${p.tierLabel}`
      : '';
  return [
    { id: 'time', side: 'self', label: 'Your time', amount: res.self.time,
      note: `${plain(i.hoursPerUnit)} hours × ${unitsWord(i.units)} × ${money(i.hourlyValue)} × 12 months` },
    { id: 'vacancy', side: 'self', label: 'Vacancy a manager would save', amount: res.self.vacancy,
      note: `${plain(i.vacantDays)} days × ${cents(i.rent / 30)} a day × ${plain(i.vacancySavedPct)}%` },
    { id: 'repairs', side: 'self', label: 'Retail markup on repairs', amount: res.self.repairs,
      note: `${plain(i.repairMarkupPct)}% of ${money(repairSpend)} a year` },
    { id: 'other', side: 'self', label: 'Other costs you entered', amount: res.self.other,
      note: 'Software, bookkeeping, legal help, listing costs, paid help' },
    { id: 'self-total', side: 'self', label: 'Self-managing, per year', amount: res.self.total, total: true,
      note: `${money(res.perUnitMonthly.self)} per unit per month` },
    { id: 'monthly', side: 'managed', label: 'Monthly management', amount: res.managed.monthly,
      note: `${money(p.perUnitMonthly)} per unit × ${unitsWord(i.units)} × 12 months${priceNote}` },
    { id: 'leasing', side: 'managed', label: 'Leasing fee', amount: res.managed.leasing,
      note: `${money(cfg.leasingFee)} with us` },
    { id: 'renewals', side: 'managed', label: 'Lease renewal fee', amount: res.managed.renewals,
      note: `${plain(i.renewalPct)}% of ${unitsWord(i.units)} renew × ${money(cfg.leaseRenewalFee)}` },
    { id: 'project', side: 'managed', label: 'Project management on repairs, at most', amount: res.managed.projectMgmt,
      note: `${plain(cfg.vendorProjectFeePct)}% of ${money(managedSpend)} in repairs at managed rates` },
    { id: 'tech', side: 'managed', label: 'Annual technology and accounting fee', amount: res.managed.techFee,
      note: `${plain(i.entities)} ${i.entities === 1 ? 'entity' : 'entities'} × ${money(cfg.techFeePerEntity)}` },
    { id: 'managed-total', side: 'managed', label: 'Management, per year', amount: res.managed.total, total: true,
      note: `${money(res.perUnitMonthly.managed)} per unit per month` },
  ];
}

/**
 * Build the calculator config from the fact bank. Takes the `pricing` object
 * from src/data/facts.ts as an argument (rather than importing it) so the
 * browser bundle only carries the handful of numbers it needs.
 */
export function buildConfig(pricing: {
  plans: readonly { monthly: number }[];
  leasingFee: number;
  leaseRenewalFee: number;
  maintenance: { vendorProjectFeePct: number };
  portfolioDiscount: { customFrom: number; tiers: readonly { min: number; max: number; pct: number; label: string }[] };
  otherFees: readonly { name: string; amount: string }[];
}, company: { name: string; shortName: string }): SelfManagementConfig {
  const tech = pricing.otherFees.find((f) => /technology and accounting/i.test(f.name));
  return {
    name: company.name,
    shortName: company.shortName,
    /* The $137 standard price. See the note at the top of this file. */
    monthly: pricing.plans[1].monthly,
    leasingFee: pricing.leasingFee,
    leaseRenewalFee: pricing.leaseRenewalFee,
    tiers: pricing.portfolioDiscount.tiers.map((t) => ({ min: t.min, max: t.max, pct: t.pct, label: t.label })),
    customFrom: pricing.portfolioDiscount.customFrom,
    vendorProjectFeePct: pricing.maintenance.vendorProjectFeePct,
    techFeePerEntity: tech ? toNumber(tech.amount.match(/\$[\d,.]+/)?.[0] ?? '', 0) : 0,
  };
}
