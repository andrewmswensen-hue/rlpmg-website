/**
 * Maintenance reserve calculator: the pure arithmetic, no DOM.
 *
 * Used twice on /tools/maintenance-reserve-calculator/:
 *   1. In the page frontmatter, to render the example result into the HTML, so
 *      the page reads as a complete answer with JavaScript off.
 *   2. In the page's processed <script>, to recompute live as the reader types.
 * Tested by scripts/test-calculators/maintenance-reserve.mjs.
 *
 * RLPM rates (labor, trip charge, the account reserve range) are NOT in this
 * file. The page reads them from src/data/facts.ts and passes them in as
 * `ReserveRates`, so a rate change in facts.ts flows through without touching
 * this module.
 *
 * The method is the page's own six-line method, plus RLPM's published cash
 * reserve guidance:
 *   - Cash reserve: months of rent per unit, held by the owner. RLPM's
 *     published starting point is six months of rent per unit
 *     (blog: how-much-money-should-you-hold-in-reserve-for-each-rental-unit, 2019;
 *     calculating-your-reserves-how-much-to-save-per-unit, 2024).
 *   - Items already at or past their expected life are added to the reserve,
 *     because that cash is needed before they fail, not saved up afterward.
 *   - Capital set-aside: each item's replacement cost divided by the months it
 *     has left (expected life minus age), summed. This is the "capital spending
 *     study" in the same two posts, and the sinking fund example in
 *     planning-property-improvements-columbus-ohio (2025).
 *   - Routine repair float: one routine repair (hours x hourly rate + trip
 *     charge) times the number of repairs to cover, refilled over twelve months.
 *     This is lines 1 to 3 of the page's "set your own number" method.
 */

export interface ReserveItem {
  id: string;
  label: string;
  /** Replacement cost for one unit, in dollars. 0 leaves the item out. */
  cost: number;
  /** Age today, in years. */
  age: number;
  /** Expected life, in years. */
  life: number;
}

export interface ReserveInputs {
  units: number;
  /** Monthly rent for one unit. */
  rent: number;
  /** Months of rent to hold as the cash reserve, per unit. */
  monthsOfRent: number;
  items: ReserveItem[];
  /** Hours in one routine repair. */
  repairHours: number;
  /** How many routine repairs the float should cover. */
  repairsCovered: number;
}

/** RLPM facts, passed in from src/data/facts.ts by the page. */
export interface ReserveRates {
  hourly: number;
  tripCharge: number;
  accountReserveMin: number;
  accountReserveMax: number;
}

export interface ItemResult {
  id: string;
  label: string;
  cost: number;
  /** Expected life minus age, never below 0. */
  yearsLeft: number;
  /** True when the item is at or past its expected life. */
  dueNow: boolean;
  /** Monthly set-aside for this item, per unit. 0 when dueNow. */
  monthly: number;
}

export interface ReserveResult {
  units: number;
  perUnit: {
    /** Months of rent times rent. */
    cashReserve: number;
    /** Replacement cost of items at or past expected life. */
    dueNow: number;
    /** cashReserve + dueNow. The headline reserve, per unit. */
    reserve: number;
    capitalMonthly: number;
    /** One routine repair at the given rates. */
    routineRepair: number;
    /** routineRepair x repairsCovered. */
    float: number;
    /** float / 12. */
    floatRefillMonthly: number;
    /** capitalMonthly + floatRefillMonthly. The headline set-aside, per unit. */
    monthly: number;
  };
  total: {
    reserve: number;
    monthly: number;
    cashReserve: number;
    dueNow: number;
    capitalMonthly: number;
    floatRefillMonthly: number;
    accountReserveMin: number;
    accountReserveMax: number;
  };
  items: ItemResult[];
  /**
   * The most expensive item that is NOT yet due, or null if none. Items due now
   * are already in the reserve at full cost, so the cash reserve is what stands
   * between the owner and the next big failure.
   */
  largest: ItemResult | null;
  /** Whether the per-unit cash reserve covers `largest`. */
  coversLargest: boolean;
  /** Monthly set-aside per unit as a percent of one month's rent. null when rent is 0. */
  monthlyPctOfRent: number | null;
}

/**
 * Example inputs. These are NOT RLPM facts: every one is an editable assumption
 * and is labeled that way on the page.
 *
 * Replacement costs and expected lives are the worked example in RLPM's own
 * post "How to Know When It's Time to Invest in Property Improvements"
 * (/blog/planning-property-improvements-columbus-ohio/, Dec 2025): roof
 * $10,000 over 20 years, HVAC $8,000 over 15, water heater $1,200 over 10,
 * flooring $4,000 over 8. Appliances use the $1,200 refrigerator from
 * /blog/how-much-money-should-you-hold-in-reserve-for-each-rental-unit/ (2019);
 * that post gives no life, so the appliance life reuses the water heater's 10
 * years from the 2025 example. Every age starts at 0 (just replaced), which
 * reproduces the 2025 post's example exactly. Readers replace all of it.
 */
export const DEFAULT_MONTHS_OF_RENT = 6;
export const DEFAULT_REPAIR_HOURS = 2;
export const DEFAULT_REPAIRS_COVERED = 2;
export const DEFAULT_UNITS = 1;

export const exampleItems = (): ReserveItem[] => [
  { id: 'roof',         label: 'Roof',         cost: 10000, age: 0, life: 20 },
  { id: 'hvac',         label: 'HVAC',         cost: 8000,  age: 0, life: 15 },
  { id: 'water-heater', label: 'Water heater', cost: 1200,  age: 0, life: 10 },
  { id: 'appliances',   label: 'Appliances',   cost: 1200,  age: 0, life: 10 },
  { id: 'flooring',     label: 'Flooring',     cost: 4000,  age: 0, life: 8 },
];

export const defaultInputs = (rent: number): ReserveInputs => ({
  units: DEFAULT_UNITS,
  rent,
  monthsOfRent: DEFAULT_MONTHS_OF_RENT,
  items: exampleItems(),
  repairHours: DEFAULT_REPAIR_HOURS,
  repairsCovered: DEFAULT_REPAIRS_COVERED,
});

/** Any non-finite or negative input becomes 0. Blank fields arrive as NaN. */
const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function calculateReserve(input: ReserveInputs, rates: ReserveRates): ReserveResult {
  const units = Math.max(1, Math.floor(clean(input.units)));
  const rent = clean(input.rent);
  const months = clean(input.monthsOfRent);

  const items: ItemResult[] = input.items
    .map((it) => {
      const cost = clean(it.cost);
      const yearsLeft = Math.max(0, clean(it.life) - clean(it.age));
      const dueNow = yearsLeft <= 0;
      return {
        id: it.id,
        label: it.label,
        cost,
        yearsLeft,
        dueNow,
        monthly: dueNow ? 0 : cost / (yearsLeft * 12),
      };
    })
    .filter((it) => it.cost > 0);

  const cashReserve = months * rent;
  const dueNow = items.filter((i) => i.dueNow).reduce((s, i) => s + i.cost, 0);
  const reserve = cashReserve + dueNow;
  const capitalMonthly = items.reduce((s, i) => s + i.monthly, 0);

  const routineRepair = clean(input.repairHours) * clean(rates.hourly) + clean(rates.tripCharge);
  const float = routineRepair * clean(input.repairsCovered);
  const floatRefillMonthly = float / 12;
  const monthly = capitalMonthly + floatRefillMonthly;

  const largest = items
    .filter((i) => !i.dueNow)
    .reduce<ItemResult | null>((a, i) => (a === null || i.cost > a.cost ? i : a), null);

  return {
    units,
    perUnit: { cashReserve, dueNow, reserve, capitalMonthly, routineRepair, float, floatRefillMonthly, monthly },
    total: {
      reserve: reserve * units,
      monthly: monthly * units,
      cashReserve: cashReserve * units,
      dueNow: dueNow * units,
      capitalMonthly: capitalMonthly * units,
      floatRefillMonthly: floatRefillMonthly * units,
      accountReserveMin: clean(rates.accountReserveMin) * units,
      accountReserveMax: clean(rates.accountReserveMax) * units,
    },
    items,
    largest,
    coversLargest: largest === null || cashReserve >= largest.cost,
    monthlyPctOfRent: rent > 0 ? (monthly / rent) * 100 : null,
  };
}

/** Whole dollars, US format, matching usd() in src/data/facts.ts. */
export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(n));

/** The short headline for the mobile sticky bar. Plain text, one or two lines on a phone. */
export const stickyLine = (r: ReserveResult): string =>
  `Hold ${money(r.total.reserve)}, set aside ${money(r.total.monthly)} a month`;

/** 6 -> "6", 4.5 -> "4.5", 2.25 -> "2.3". */
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));
const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;

/**
 * Every visible result string, keyed by the element id suffix the page uses
 * (`mr-<key>`). The page renders these server-side for the example, and the
 * script writes them again on every input, so the wording cannot drift between
 * the no-JavaScript page and the live calculator.
 */
export function resultText(input: ReserveInputs, r: ReserveResult): Record<string, string> {
  const u = r.units;
  const months = clean(input.monthsOfRent);
  const pct = r.monthlyPctOfRent === null ? '' : `${Math.round(r.monthlyPctOfRent)}% of one month's rent`;
  const across = u === 1 ? 'For one unit' : `${money(r.perUnit.reserve)} per unit across ${u} units`;
  const acrossMonthly = u === 1
    ? (pct ? `${pct}, for one unit` : 'for one unit')
    : `${money(r.perUnit.monthly)} per unit across ${u} units${pct ? `, ${pct}` : ''}`;
  const due = r.items.filter((i) => i.dueNow);

  let check = r.items.length
    ? 'Every item you entered is due now and already counted in the reserve.'
    : 'Add a replacement cost above to check your reserve against it.';
  if (r.largest) {
    const what = `${r.largest.label}, ${money(r.largest.cost)}`;
    check = r.coversLargest
      ? `Your cash reserve per unit covers your largest remaining item (${what}).`
      : `Your cash reserve per unit is ${money(r.largest.cost - r.perUnit.cashReserve)} short of your largest remaining item (${what}). Consider more months of rent.`;
  }

  const t: Record<string, string> = {
    'reserve': money(r.total.reserve),
    'reserve-sub': across,
    'monthly': money(r.total.monthly),
    'monthly-sub': acrossMonthly,
    'cash': money(r.total.cashReserve),
    'cash-note': `${plural(months, 'month', 'months')} of rent${u === 1 ? '' : `, times ${u} units`}`,
    'due': money(r.total.dueNow),
    'due-note': due.length ? `At or past expected life: ${due.map((i) => i.label).join(', ')}` : 'Nothing is past its expected life',
    'capital': `${money(r.total.capitalMonthly)} a month`,
    'refill': `${money(r.total.floatRefillMonthly)} a month`,
    'refill-note': `Refills a ${money(r.perUnit.float)} float per unit (${plural(clean(input.repairsCovered), 'repair', 'repairs')} at ${money(r.perUnit.routineRepair)}) over 12 months`,
    'account': `${money(r.total.accountReserveMin)} to ${money(r.total.accountReserveMax)}`,
    'check': check,
    'summary': `Hold ${money(r.total.reserve)} in reserve and set aside ${money(r.total.monthly)} a month.`,
  };

  for (const it of input.items) {
    const res = r.items.find((x) => x.id === it.id);
    t[`item-${it.id}-left`] = !res ? 'Left out' : res.dueNow ? 'Due now' : `${plural(res.yearsLeft, 'year', 'years')} left`;
    t[`item-${it.id}-monthly`] = !res ? '$0' : res.dueNow ? 'In reserve' : `${money(res.monthly * u)} a month`;
  }
  return t;
}
