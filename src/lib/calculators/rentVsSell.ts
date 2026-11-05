/**
 * Rent vs. sell calculator: the math, plus the small pure helpers that turn the
 * math into words, numbers and an SVG chart.
 *
 * Ported from Andrew's standalone calculator in
 * Projects/RLPM-Rent-vs-Sell-Calculator (_part_engine.js and _part_ui.js,
 * August 2026). The engine below is the same math, line for line, so the 40
 * hand-checked assertions in that project's test-engine.js still apply. They are
 * ported to scripts/test-calculators/rent-vs-sell.mjs.
 *
 * One deliberate addition: management can be a flat monthly price (how
 * RL Property Management charges, read from src/data/facts.ts) as well as a
 * percent of rent (how the original modeled it). `pmMode` defaults to percent
 * when it is missing, so the original tests run unchanged.
 *
 * Everything here is pure: no DOM, no network. The page uses it twice, once at
 * build time to print the worked example into the HTML (so the page is a
 * complete answer with JavaScript off) and once in the browser to make it live.
 */
import { company, pricing, usd } from '../../data/facts';

/* =========================================================================
   Types
   ========================================================================= */

export type TaxMode = 'percent' | 'dollar';
export type PmMode = 'percent' | 'flat';

export interface RvsInputs {
  homeValue: number; pricePaid: number; capitalImprovements: number;
  mortgageBalance: number; interestRate: number; remainingTermYears: number;
  monthlyRent: number; rentGrowth: number; vacancyRate: number;
  propertyTaxMode: TaxMode; propertyTaxRate: number; propertyTaxMonthly: number;
  insuranceMonthly: number; landlordInsBump: number; hoaMonthly: number;
  /** Percent of collected rent, used when pmMode is 'percent' (the original model). */
  pmRate: number;
  /** 'flat' = a fixed monthly price, like RLPM's plans. Missing = 'percent'. */
  pmMode?: PmMode;
  /** Monthly management price when pmMode is 'flat'. Rises with expense inflation. */
  pmMonthly?: number;
  leasingRate: number; maintenanceRate: number; capexRate: number;
  appreciationRate: number; expenseInflation: number; yearsToHold: number;
  isPrimaryResidence: boolean; yearsLivedIn: number; marriedFilingJointly: boolean;
  makeReadyCosts: number; refurbToSell: number;
  realtorCommission: number; closingCosts: number;
  incomeTaxRate: number; capGainsRate: number; recaptureRate: number;
  landPct: number; reinvestmentRate: number;
}

export interface RvsRow {
  year: number;
  houseValue: number; mortgageBalance: number; equity: number;
  grossRent: number; collectedRent: number;
  mortgagePaid: number; mortgageInterest: number;
  opex: number;
  breakdown: {
    propertyTax: number; insurance: number; hoa: number;
    management: number; leasing: number; maintenance: number; capex: number;
  };
  depreciation: number; accumDep: number; accumCapex: number; adjustedBasis: number;
  taxOnRent: number; cashBeforeTax: number; netCashFlow: number; cumulativeCash: number;
  sellingCosts: number; capGainsTax: number; recaptureTax: number; exclusionUsed: number;
  /** Tax value of suspended passive losses released at sale. Display only. */
  lossBenefit: number;
  netProceeds: number; wealthRent: number; wealthSell: number; difference: number;
}

export interface RvsResult {
  rows: RvsRow[];
  payment: number;
  annualDep: number;
  buildingBasis: number;
  sellNow: { price: number; costs: number; mortgage: number; gain: number; exclusion: number; tax: number; net: number };
  summary: {
    years: number; difference: number; favors: 'rent' | 'sell'; breakEvenYear: number | null;
    monthlyCashFlowY1: number; monthlyCashFlowY1AfterTax: number; upfrontCash: number;
    wealthRent: number; wealthSell: number;
  };
}

/* =========================================================================
   Engine (ported unchanged from _part_engine.js, plus the flat-price option)
   ========================================================================= */

/** Section 121 exclusion caps (IRS, statutory). */
export const EXCLUSION_JOINT = 500000;
export const EXCLUSION_SINGLE = 250000;

/** Level monthly payment (principal + interest) that retires `balance` over `months`. */
export function pmt(balance: number, annualRatePct: number, months: number): number {
  if (balance <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return balance / months;
  return balance * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

/** Month-by-month amortization from TODAY'S balance. Index 0..years.
 *  Payments stop the month the loan hits zero. */
export function amortize(balance: number, annualRatePct: number, termMonths: number, years: number) {
  const r = annualRatePct / 100 / 12;
  const payment = pmt(balance, annualRatePct, termMonths);
  let bal = balance;
  const out = [{ balance: bal, interest: 0, principal: 0, paid: 0 }];
  for (let y = 1; y <= years; y++) {
    let interest = 0, principal = 0, paid = 0;
    for (let m = 0; m < 12; m++) {
      if (bal <= 0.005) { bal = 0; continue; }
      const i = bal * r;
      let p = payment - i;
      let thisPay = payment;
      if (p >= bal) { p = bal; thisPay = bal + i; }   /* payoff month */
      bal -= p;
      interest += i; principal += p; paid += thisPay;
    }
    out.push({ balance: Math.max(0, bal), interest, principal, paid });
  }
  return out;
}

export function model(x: RvsInputs): RvsResult {
  const N = Math.max(1, Math.round(x.yearsToHold));
  const g = x.appreciationRate / 100;
  const infl = x.expenseInflation / 100;
  const reinv = x.reinvestmentRate / 100;
  const rentG = x.rentGrowth / 100;
  const cap121 = x.marriedFilingJointly ? EXCLUSION_JOINT : EXCLUSION_SINGLE;
  const sellPct = (x.realtorCommission + x.closingCosts) / 100;

  const termMonths = Math.max(0, Math.round(x.remainingTermYears * 12));
  const payment = pmt(x.mortgageBalance, x.interestRate, termMonths);
  const loan = amortize(x.mortgageBalance, x.interestRate, termMonths, N);

  /* Depreciable basis on conversion to a rental = LESSER of adjusted cost
     basis or fair market value at conversion, minus the land portion.
     (IRS Pub 527.) Residential rental life = 27.5 years. */
  const conversionBasis = Math.min(x.pricePaid + x.capitalImprovements, x.homeValue);
  const buildingBasis = Math.max(0, conversionBasis * (1 - x.landPct / 100));
  const annualDep = buildingBasis / 27.5;

  /* ---------------- SELL NOW (today) ---------------- */
  const snCosts = x.homeValue * sellPct + x.refurbToSell;
  const snBasis = x.pricePaid + x.capitalImprovements;
  const snGain = x.homeValue - snCosts - snBasis;
  const snEligible = x.isPrimaryResidence && x.yearsLivedIn >= 2;
  const snExcl = snEligible ? Math.min(cap121, Math.max(0, snGain)) : 0;
  const snTax = Math.max(0, snGain - snExcl) * (x.capGainsRate / 100);
  const sellNowNet = x.homeValue - snCosts - x.mortgageBalance - snTax;

  /* ---------------- RENT IT OUT ---------------- */
  let cumCash = -(x.makeReadyCosts + x.capitalImprovements);
  let accumCapex = 0;   /* capital reserve actually spent -> adds to basis */
  let accumDep = 0;
  let suspended = 0;    /* passive losses carried forward, released at sale */
  const rows: RvsRow[] = [];
  let breakEven: number | null = null;

  for (let t = 1; t <= N; t++) {
    const valEnd = x.homeValue * Math.pow(1 + g, t);
    const valAvg = x.homeValue * Math.pow(1 + g, t - 0.5);
    const infF = Math.pow(1 + infl, t - 1);
    const L = loan[t];

    const grossRent = x.monthlyRent * 12 * Math.pow(1 + rentG, t - 1);
    const collected = grossRent * (1 - x.vacancyRate / 100);

    const propTax = (x.propertyTaxMode === 'percent')
      ? valAvg * (x.propertyTaxRate / 100)
      : x.propertyTaxMonthly * 12 * infF;
    const insurance = x.insuranceMonthly * 12 * (1 + x.landlordInsBump / 100) * infF;
    const hoa = x.hoaMonthly * 12 * infF;
    const mgmt = x.pmMode === 'flat'
      ? (x.pmMonthly ?? 0) * 12 * infF
      : collected * (x.pmRate / 100);
    const leasing = grossRent * (x.leasingRate / 100);
    const maint = valAvg * (x.maintenanceRate / 100);
    const capex = valAvg * (x.capexRate / 100);
    const opex = propTax + insurance + hoa + mgmt + leasing + maint + capex;

    const cashBeforeTax = collected - L.paid - opex;

    /* Depreciation, capped at the 27.5-year life */
    const dep = Math.max(0, Math.min(annualDep, buildingBasis - accumDep));
    accumDep += dep;

    /* Taxable rental income. The CapEx reserve is a savings set-aside,
       not a deductible expense, so it is excluded here on purpose. */
    const taxable = collected - L.interest - propTax - insurance - hoa
                  - mgmt - leasing - maint - dep;
    let tax = 0;
    if (taxable > 0) {
      const used = Math.min(suspended, taxable);
      suspended -= used;
      tax = (taxable - used) * (x.incomeTaxRate / 100);
    } else {
      suspended += -taxable;
    }

    const netCF = cashBeforeTax - tax;
    cumCash = cumCash * (1 + reinv) + netCF;
    accumCapex += capex;

    /* ----- If you sold at the END of this year ----- */
    const sellCosts = valEnd * sellPct + x.refurbToSell;
    const adjBasis = x.pricePaid + x.capitalImprovements + accumCapex - accumDep;
    const totalGain = valEnd - sellCosts - adjBasis;

    /* Section 121 needs 2 of the 5 years before the sale as your home.
       After 3 full years as a rental the exclusion is gone. */
    const livedInWindow = Math.min(x.yearsLivedIn, Math.max(0, 5 - t));
    const eligible121 = x.isPrimaryResidence && livedInWindow >= 2;

    const recapture = Math.min(accumDep, Math.max(0, totalGain));
    let apprGain = Math.max(0, totalGain - recapture);
    const excl = eligible121 ? Math.min(cap121, apprGain) : 0;
    apprGain -= excl;

    const recapTax = recapture * (x.recaptureRate / 100);
    const cgTax = apprGain * (x.capGainsRate / 100);
    const suspBenefit = suspended * (x.incomeTaxRate / 100);

    const netProceeds = valEnd - sellCosts - L.balance - recapTax - cgTax + suspBenefit;
    const wealthRent = netProceeds + cumCash;
    const wealthSell = sellNowNet * Math.pow(1 + reinv, t);

    if (breakEven === null && wealthRent >= wealthSell) breakEven = t;

    rows.push({
      year: t,
      houseValue: valEnd,
      mortgageBalance: L.balance,
      equity: valEnd - L.balance,
      grossRent, collectedRent: collected,
      mortgagePaid: L.paid,
      mortgageInterest: L.interest,
      opex,
      breakdown: {
        propertyTax: propTax, insurance, hoa,
        management: mgmt, leasing, maintenance: maint, capex,
      },
      depreciation: dep,
      accumDep, accumCapex,
      adjustedBasis: adjBasis,
      taxOnRent: tax,
      cashBeforeTax,
      netCashFlow: netCF,
      cumulativeCash: cumCash,
      sellingCosts: sellCosts,
      capGainsTax: cgTax,
      recaptureTax: recapTax,
      exclusionUsed: excl,
      lossBenefit: suspBenefit,
      netProceeds, wealthRent, wealthSell,
      difference: wealthRent - wealthSell,
    });
  }

  const y1 = rows[0];
  const last = rows[rows.length - 1];

  return {
    rows, payment, annualDep, buildingBasis,
    sellNow: {
      price: x.homeValue, costs: snCosts, mortgage: x.mortgageBalance,
      gain: snGain, exclusion: snExcl, tax: snTax, net: sellNowNet,
    },
    summary: {
      years: N,
      difference: last.difference,
      favors: last.difference >= 0 ? 'rent' : 'sell',
      breakEvenYear: breakEven,
      monthlyCashFlowY1: y1.cashBeforeTax / 12,
      monthlyCashFlowY1AfterTax: y1.netCashFlow / 12,
      upfrontCash: x.makeReadyCosts + x.capitalImprovements,
      wealthRent: last.wealthRent,
      wealthSell: last.wealthSell,
    },
  };
}

/* =========================================================================
   Defaults and the management choice
   ========================================================================= */

/** How the home would be managed. RLPM's three plans come from the fact bank. */
export interface ManagementOption { value: string; label: string; mode: PmMode; monthly?: number }

export const MANAGEMENT_OPTIONS: ManagementOption[] = [
  ...pricing.plans.map((p) => ({
    value: p.id, label: `${company.shortName} ${p.name} (${usd(p.monthly)} a month)`,
    mode: 'flat' as PmMode, monthly: p.monthly,
  })),
  { value: 'percent', label: 'Another manager, percent of rent', mode: 'percent' },
  { value: 'self', label: 'I would manage it myself', mode: 'flat', monthly: 0 },
];

/** The middle plan, the same one the previous version of this page used. */
export const DEFAULT_MANAGEMENT = pricing.plans[1].id;

/** Calculator state as the page holds it: the engine inputs plus the management choice. */
export type RvsState = RvsInputs & { management: string };

/**
 * Starting scenario, from the original calculator: a representative Franklin
 * County single-family home. Deliberately NOT tuned to make renting look good.
 * Every one of these is an editable assumption on the page.
 */
export const DEFAULTS: RvsState = {
  homeValue: 285000, pricePaid: 205000, capitalImprovements: 0,
  mortgageBalance: 150000, interestRate: 4.5, remainingTermYears: 24,
  monthlyRent: 2050, rentGrowth: 3, vacancyRate: 6,
  propertyTaxMode: 'percent', propertyTaxRate: 1.7, propertyTaxMonthly: 404,
  insuranceMonthly: 105, landlordInsBump: 20, hoaMonthly: 0,
  management: DEFAULT_MANAGEMENT, pmRate: 8,
  leasingRate: 4, maintenanceRate: 1, capexRate: 0.5,
  appreciationRate: 3.5, expenseInflation: 3, yearsToHold: 10,
  isPrimaryResidence: true, yearsLivedIn: 5, marriedFilingJointly: true,
  makeReadyCosts: 3500, refurbToSell: 0,
  realtorCommission: 6, closingCosts: 3,
  incomeTaxRate: 24, capGainsRate: 15, recaptureRate: 25,
  landPct: 20, reinvestmentRate: 6,
};

/** Turn page state into engine inputs, resolving the management choice. */
export function toInputs(s: RvsState): RvsInputs {
  const opt = MANAGEMENT_OPTIONS.find((o) => o.value === s.management) ?? MANAGEMENT_OPTIONS[1];
  return { ...s, pmMode: opt.mode, pmMonthly: opt.monthly ?? 0 };
}

/* =========================================================================
   Formatting
   ========================================================================= */

const fmt0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
/** Whole dollars. Negative amounts use a true minus sign. */
export const money = (n: number) => {
  const v = Math.round(n);
  return (v < 0 ? '−' : '') + fmt0.format(Math.abs(v));
};
/** Plain number with thousands separators, for the input boxes. */
export const num = (n: number) => Math.round(n).toLocaleString('en-US');
export const parseNum = (v: unknown) => {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const yrs = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`;

/* =========================================================================
   Words: the headline, stats, hints and breakdown
   ========================================================================= */

export interface Verdict { lead: string; amount: string; tail: string; note: string; plain: string }

export function verdict(R: RvsResult, s: RvsState): Verdict {
  const sm = R.summary;
  const rent = sm.difference >= 0;
  const lead = rent ? 'Renting it out comes out ahead by' : 'Selling now comes out ahead by';
  const amount = money(Math.abs(sm.difference));
  const tail = `over ${yrs(sm.years)}`;
  let note = rent
    ? `That is the projected gap in what you would walk away with after ${yrs(sm.years)}, after every tax and selling cost along the way.`
    : `Selling today and investing the cash at ${s.reinvestmentRate}% projects ahead of renting for ${yrs(sm.years)} and then selling.`;
  if (rent && sm.monthlyCashFlowY1 < 0) {
    note += ` Renting still costs you ${money(Math.abs(sm.monthlyCashFlowY1))} a month out of pocket in year one, so the gain is equity and appreciation, not income.`;
  }
  return { lead, amount, tail, note, plain: `${lead} ${amount} ${tail}.` };
}

/** One line restating the scenario, so the result never floats free of its inputs. */
export function scenarioLine(s: RvsState): string {
  return `Based on a ${money(s.homeValue)} home with ${money(s.mortgageBalance)} left on the mortgage, ` +
    `renting for ${money(s.monthlyRent)} a month, held ${yrs(Math.max(1, Math.round(s.yearsToHold)))}.`;
}

export interface Stat { label: string; value: string; sub: string; tone: '' | 'pos' | 'neg' }

export function stats(R: RvsResult): Stat[] {
  const sm = R.summary, sn = R.sellNow;
  const be = sm.breakEvenYear;
  return [
    {
      label: 'Cash flow, year one', tone: sm.monthlyCashFlowY1 >= 0 ? 'pos' : 'neg',
      value: `${money(sm.monthlyCashFlowY1)}/mo`, sub: 'after the mortgage and all costs, before income tax',
    },
    {
      label: 'Cash in hand if you sell today', tone: '', value: money(sn.net),
      sub: `after ${money(sn.costs)} in selling costs` +
        (sn.tax > 0 ? ` and ${money(sn.tax)} in capital gains tax` : sn.exclusion > 0 ? ', no capital gains tax owed' : ''),
    },
    {
      label: 'Out of pocket to start renting', tone: '', value: money(sm.upfrontCash),
      sub: 'make-ready work and improvements',
    },
    be === 1
      ? { label: 'Renting pulls ahead in', tone: 'pos', value: 'Year 1', sub: 'renting is ahead from the start' }
      : be
        ? { label: 'Renting pulls ahead in', tone: 'pos', value: `Year ${be}`, sub: 'when renting overtakes selling' }
        : { label: 'Renting pulls ahead in', tone: 'neg', value: `Not within ${yrs(sm.years)}`, sub: 'selling stays ahead the whole time' },
  ];
}

/** Live hints shown under specific inputs, keyed by input name. Plain text. */
export function hints(s: RvsState, R: RvsResult): Record<string, string> {
  const x = toInputs(s);
  const yTax = s.propertyTaxMode === 'percent' ? s.homeValue * (s.propertyTaxRate / 100) : s.propertyTaxMonthly * 12;
  const mgmt = x.pmMode === 'flat'
    ? (x.pmMonthly ? `${money(x.pmMonthly)} a month, assumed to rise with expense inflation.` : 'No management cost is counted. Budget your own time.')
    : `About ${money(s.monthlyRent * (1 - s.vacancyRate / 100) * s.pmRate / 100)} a month at today’s rent.`;
  return {
    payment: s.mortgageBalance > 0 ? `Principal and interest: ${money(R.payment)} a month.` : 'No payment, the home is paid off.',
    propertyTax: `${money(yTax / 12)} a month, ${money(yTax)} a year.`,
    insurance: `As a rental, with the ${s.landlordInsBump}% landlord markup: ${money(s.insuranceMonthly * (1 + s.landlordInsBump / 100))} a month.`,
    management: mgmt,
    maintenance: `About ${money(s.homeValue * s.maintenanceRate / 100 / 12)} a month.`,
    capex: `About ${money(s.homeValue * s.capexRate / 100 / 12)} a month.`,
    depreciation: `Building basis ${money(R.buildingBasis)}, so ${money(R.annualDep)} a year in depreciation.`,
  };
}

/** The first year in which the primary-residence exclusion has run out, if any. */
export function cliffYear(rows: RvsRow[]): number | null {
  const i = rows.findIndex((r, k) => k > 0 && rows[k - 1].exclusionUsed > 0 && r.exclusionUsed === 0);
  return i > 0 ? rows[i].year : null;
}

export function chartCaption(rows: RvsRow[]): string {
  let cn = 'Both lines are cash in hand after tax and after the cost of selling, so any year compares fairly.';
  const c = cliffYear(rows);
  if (c) {
    cn += ` The step down in year ${c} is real: the capital gains exclusion on a home you lived in needs 2 of the ` +
      '5 years before the sale, so it runs out 3 years after you move out.';
  }
  return cn;
}

interface Line { label: string; value: string; total?: boolean }

const list = (title: string, lines: Line[]) =>
  `<div class="rvs-bd"><h4 class="rvs-bd-h">${title}</h4><dl>` +
  lines.map((l) => `<div class="${l.total ? 'rvs-bd-total' : ''}"><dt>${l.label}</dt><dd>${l.value}</dd></div>`).join('') +
  '</dl></div>';

/** "How the numbers add up": sell today, rent then sell, and an average month in year one. HTML. */
export function breakdownHtml(R: RvsResult, s: RvsState): string {
  const sn = R.sellNow, sm = R.summary, last = R.rows[R.rows.length - 1], y1 = R.rows[0], b = y1.breakdown;
  const N = sm.years;
  const saleTax = last.capGainsTax + last.recaptureTax;
  const sell = list('Sell today', [
    { label: 'Sale price', value: money(sn.price) },
    { label: 'Selling costs', value: money(-sn.costs) },
    { label: 'Mortgage payoff', value: money(-sn.mortgage) },
    { label: 'Capital gains tax', value: sn.tax > 0 ? money(-sn.tax) : money(0) },
    { label: 'Cash in hand today', value: money(sn.net), total: true },
    { label: `Invested at ${s.reinvestmentRate}% for ${yrs(N)}`, value: money(last.wealthSell), total: true },
  ]);
  const rentLines: Line[] = [
    { label: `Sale price in year ${N}`, value: money(last.houseValue) },
    { label: 'Selling costs', value: money(-last.sellingCosts) },
    { label: 'Mortgage payoff', value: money(-last.mortgageBalance) },
    { label: 'Tax on the sale', value: money(-saleTax) },
  ];
  if (last.lossBenefit > 0.5) rentLines.push({ label: 'Carried-forward rental losses', value: money(last.lossBenefit) });
  rentLines.push(
    { label: 'Rental cash flow banked, after the start-up cost', value: money(last.cumulativeCash) },
    { label: 'What you walk away with', value: money(last.wealthRent), total: true },
  );
  const rent = list(`Rent ${yrs(N)}, then sell`, rentLines);
  const m = (n: number) => money(n / 12);
  const monthLines: Line[] = [
    { label: 'Rent collected, after vacancy', value: m(y1.collectedRent) },
    { label: 'Mortgage, principal and interest', value: m(-y1.mortgagePaid) },
    { label: 'Property tax', value: m(-b.propertyTax) },
    { label: 'Insurance', value: m(-b.insurance) },
  ];
  if (b.hoa > 0) monthLines.push({ label: 'HOA dues', value: m(-b.hoa) });
  monthLines.push(
    { label: 'Management', value: m(-b.management) },
    { label: 'Leasing and turnover allowance', value: m(-b.leasing) },
    { label: 'Maintenance', value: m(-b.maintenance) },
    { label: 'Capital reserve', value: m(-b.capex) },
    { label: 'Cash flow, before income tax', value: m(y1.cashBeforeTax), total: true },
  );
  const month = list('An average month in year one', monthLines);
  return `<div class="rvs-bd-grid">${sell}${rent}</div>${month}`;
}

/** Year-by-year table body rows. HTML. */
export function tableRowsHtml(rows: RvsRow[]): string {
  return rows.map((r) =>
    '<tr>' +
    `<th scope="row">${r.year}</th>` +
    `<td>${money(r.collectedRent)}</td>` +
    `<td>${r.mortgagePaid > 0 ? money(-r.mortgagePaid) : money(0)}</td>` +
    `<td>${money(-r.opex)}</td>` +
    `<td class="${r.netCashFlow >= 0 ? 'pos' : 'neg'}">${money(r.netCashFlow)}</td>` +
    `<td>${money(r.houseValue)}</td>` +
    `<td class="hl">${money(r.wealthRent)}</td>` +
    `<td class="hl">${money(r.wealthSell)}</td>` +
    `<td class="hl ${r.difference >= 0 ? 'pos' : 'neg'}">${money(r.difference)}</td>` +
    '</tr>').join('');
}

/* =========================================================================
   Chart: an SVG string, so the same drawing prints at build time and live
   ========================================================================= */

const C = { rent: '#a60530', sell: '#123143', grid: '#dde5eb', axis: '#c9d4dc', text: '#5d7280' };

const kfmt = (v: number) => {
  const a = Math.abs(v), sign = v < 0 ? '−' : '';
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  return `${sign}$${Math.round(a / 1000)}k`;
};

/**
 * Two lines: wealth if you rent, wealth if you sell now. `width` is the pixel
 * width it will be drawn at, so text stays a readable size on a phone.
 */
export function chartSvg(rows: RvsRow[], width = 640): string {
  const W = Math.max(280, Math.round(width));
  const H = W < 480 ? 250 : 300;
  const M = { t: 22, r: 16, b: 30, l: 56 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const n = rows.length;

  const all: number[] = [];
  rows.forEach((r) => all.push(r.wealthRent, r.wealthSell));
  let lo = Math.min(...all), hi = Math.max(...all);
  if (lo > 0) lo *= 0.92;
  const pad = (hi - lo) * 0.10 || 1000;
  lo -= pad; hi += pad;
  /* Round the axis to tidy steps ($20k, $50k, $100k ...) so the labels read cleanly. */
  const rawStep = (hi - lo) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const stepV = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= rawStep) ?? 10 * mag;
  lo = Math.floor(lo / stepV) * stepV; hi = Math.ceil(hi / stepV) * stepV;

  const X = (i: number) => M.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const Y = (v: number) => M.t + ih - ((v - lo) / (hi - lo)) * ih;
  const f = (v: number) => v.toFixed(1);
  const txt = (x: number, y: number, s: string, anchor = 'middle', extra = '') =>
    `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" fill="${C.text}" font-size="12" font-weight="500"${extra}>${s}</text>`;

  let out = '';
  for (let v = lo; v <= hi + stepV / 2; v += stepV) {
    const y = Y(v);
    out += `<line x1="${M.l}" y1="${f(y)}" x2="${W - M.r}" y2="${f(y)}" stroke="${C.grid}" stroke-width="1"/>`;
    out += txt(M.l - 8, y + 4, kfmt(v), 'end');
  }
  if (lo < 0 && hi > 0) out += `<line x1="${M.l}" y1="${f(Y(0))}" x2="${W - M.r}" y2="${f(Y(0))}" stroke="${C.axis}" stroke-width="1.5"/>`;

  const maxLabels = Math.max(2, Math.floor(iw / 34));
  const step = Math.max(1, Math.ceil(n / maxLabels));
  rows.forEach((r, i) => {
    if (i % step !== 0 && i !== n - 1) return;
    if (i !== n - 1 && n - 1 - i < step && i !== 0) return;   /* keep the last label clear */
    out += txt(X(i), H - 9, String(r.year));
  });

  /* crossover marker */
  for (let j = 1; j < n; j++) {
    const a = rows[j - 1], b = rows[j];
    if ((a.difference < 0) !== (b.difference < 0)) {
      const fr = Math.abs(a.difference) / (Math.abs(a.difference) + Math.abs(b.difference));
      const cx = X(j - 1) + (X(j) - X(j - 1)) * fr;
      out += `<line x1="${f(cx)}" y1="${M.t}" x2="${f(cx)}" y2="${M.t + ih}" stroke="${C.text}" stroke-width="1" stroke-dasharray="3 4"/>`;
      out += txt(cx, M.t - 7, 'Crossover', 'middle', ' letter-spacing=".04em"');
      break;
    }
  }

  const path = (key: 'wealthRent' | 'wealthSell', color: string) => {
    if (n > 1) {
      const d = rows.map((r, i) => `${i ? 'L' : 'M'}${f(X(i))} ${f(Y(r[key]))}`).join(' ');
      out += `<path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    const lastR = rows[n - 1];
    out += `<circle cx="${f(X(n - 1))}" cy="${f(Y(lastR[key]))}" r="4.5" fill="${color}" stroke="#fff" stroke-width="2"/>`;
  };
  path('wealthSell', C.sell);
  path('wealthRent', C.rent);

  const last = rows[n - 1];
  const label = `Projected wealth over ${yrs(n)}. Rent it out, then sell: ${money(last.wealthRent)} by year ${last.year}. ` +
    `Sell now and invest: ${money(last.wealthSell)} by year ${last.year}.`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}" ` +
    `font-family="Inter, ui-sans-serif, system-ui, sans-serif" class="rvs-chart-svg">${out}</svg>`;
}
