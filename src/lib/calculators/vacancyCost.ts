/**
 * Vacancy cost calculator. Pure functions, no DOM, no network.
 *
 * Used twice: by the page frontmatter to render the default result into the
 * HTML (so the page is complete with JavaScript off), and by the page's client
 * script to recompute as the owner types. One formula, one place.
 *
 * THE MODEL
 *   Lost rent        monthly rent / 30, times vacant days
 *   Vacant-unit costs utilities, lawn and snow the owner picks up while the unit
 *                     is empty, prorated the same way
 *   Turn cost        one time: paint, cleaning, repairs between residents
 *   Leasing cost     one time: whatever the manager charges to place a resident
 *   Total            the four lines added together. This is what the vacancy costs.
 *
 * WHY MORTGAGE, TAXES AND INSURANCE ARE NOT IN THE TOTAL
 * Many vacancy calculators add the mortgage on top of lost rent. That counts it
 * twice: those bills are paid whether the unit is full or empty, and in an
 * occupied month the rent covers them. The cost of being empty is the rent that
 * did not come in. What those fixed bills do change is the cash the owner has to
 * put in while the unit sits empty, so they feed `outOfPocket` instead.
 *
 * The 30-day month matches the convention the page teaches.
 */

export const DAYS_IN_MONTH = 30;
/** Upper bound on vacant days. A year covers every realistic case and stops typos like 3200. */
export const MAX_DAYS = 365;

export interface VacancyInputs {
  /** Monthly rent, dollars. */
  monthlyRent: number;
  /** Days from move-out to the first day of rent under the new lease. */
  daysVacant: number;
  /** Utilities, lawn and snow the owner pays only because the unit is empty, per month. */
  monthlyVacantCosts: number;
  /** One-time make-ready cost. */
  turnCost: number;
  /** One-time cost to lease the unit (a manager's leasing charge, ads, photos). */
  leasingCost: number;
  /** Optional. Mortgage, taxes, insurance, HOA per month. Only affects `outOfPocket`. */
  monthlyFixedCosts?: number;
}

export interface VacancyResult {
  days: number;
  lostRent: number;
  vacantCosts: number;
  turnCost: number;
  leasingCost: number;
  /** What the vacancy costs the owner. */
  total: number;
  /** Running cost of one more vacant day: (rent + vacant-unit costs) / 30. */
  perDay: number;
  /** Total as a share of twelve months of rent, 0 to 1+. Null when rent is 0. */
  shareOfYearRent: number | null;
  /** Cash the owner pays out during the vacancy, including fixed bills. */
  outOfPocket: number;
}

/** Any input becomes a finite, non-negative number. Bad input reads as 0. */
export const clean = (n: unknown): number => {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/**
 * Read a typed value like "$1,708", "1708.50" or " 32 days" as a number.
 * Anything without digits reads as 0, and so does a negative value like "-5"
 * (stripping the minus sign would silently turn it into 5).
 */
export const parseAmount = (s: string | null | undefined): number => {
  if (s == null) return 0;
  const t = String(s).trim();
  if (t.startsWith('-')) return 0;
  const digits = t.replace(/[^0-9.]/g, '');
  // Keep only the first decimal point.
  const [whole, ...rest] = digits.split('.');
  const v = Number(rest.length ? `${whole}.${rest.join('')}` : whole);
  return clean(v);
};

export const clampDays = (d: unknown): number => Math.min(MAX_DAYS, Math.round(clean(d)));

/** Lost rent alone, unrounded. The page's tables round this for display. */
export const lostRent = (monthlyRent: number, days: number): number =>
  (clean(monthlyRent) / DAYS_IN_MONTH) * clampDays(days);

export function vacancyCost(input: VacancyInputs): VacancyResult {
  const rent = clean(input.monthlyRent);
  const days = clampDays(input.daysVacant);
  const monthlyVacant = clean(input.monthlyVacantCosts);
  const turn = clean(input.turnCost);
  const leasing = clean(input.leasingCost);
  const fixed = clean(input.monthlyFixedCosts);

  const lost = (rent / DAYS_IN_MONTH) * days;
  const vacantCosts = (monthlyVacant / DAYS_IN_MONTH) * days;
  const total = lost + vacantCosts + turn + leasing;

  return {
    days,
    lostRent: lost,
    vacantCosts,
    turnCost: turn,
    leasingCost: leasing,
    total,
    perDay: (rent + monthlyVacant) / DAYS_IN_MONTH,
    shareOfYearRent: rent > 0 ? total / (rent * 12) : null,
    outOfPocket: vacantCosts + (fixed / DAYS_IN_MONTH) * days + turn + leasing,
  };
}

export interface CompareInputs {
  monthlyRent: number;
  monthlyVacantCosts: number;
  turnCost: number;
  /** Days to make the unit rent-ready. Held the same on both sides. */
  turnDays: number;
  /** The other manager: days on market and leasing charge as a percent of one month's rent. */
  otherDaysOnMarket: number;
  otherLeasingPct: number;
  /** RL Property Management: published median days on market and leasing fee (facts.ts). */
  rlDaysOnMarket: number;
  rlLeasingFee: number;
}

export interface CompareSide { days: number; leasingCost: number; total: number }
export interface CompareResult {
  other: CompareSide;
  rl: CompareSide;
  /** other.total minus rl.total. Negative means the other side costs less with these inputs. */
  difference: number;
}

/**
 * Same unit, same rent, same turn, two managers. Only days on market and the
 * leasing charge differ, because those are the two things a manager changes.
 */
export function compareManagers(c: CompareInputs): CompareResult {
  const rent = clean(c.monthlyRent);
  const turnDays = clampDays(c.turnDays);
  const side = (dom: number, leasing: number): CompareSide => {
    const r = vacancyCost({
      monthlyRent: rent,
      daysVacant: turnDays + clampDays(dom),
      monthlyVacantCosts: c.monthlyVacantCosts,
      turnCost: c.turnCost,
      leasingCost: leasing,
    });
    return { days: r.days, leasingCost: r.leasingCost, total: r.total };
  };
  const other = side(c.otherDaysOnMarket, rent * (clean(c.otherLeasingPct) / 100));
  const rl = side(c.rlDaysOnMarket, clean(c.rlLeasingFee));
  // Difference of the rounded totals, so the sentence matches the two figures shown above it.
  return { other, rl, difference: Math.round(other.total) - Math.round(rl.total) };
}

/** The short headline for the mobile sticky bar. `money` formats whole dollars (pass usd from facts.ts). */
export const stickyLine = (r: VacancyResult, money: (n: number) => string): string =>
  `This vacancy costs you ${money(r.total)}`;
