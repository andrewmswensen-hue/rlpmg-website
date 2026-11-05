/**
 * Rent estimate for the vacancy cost calculator's "Edit property details" panel.
 * Pure functions over RLPM's own portfolio medians in src/data/markets.ts.
 * No network, no DOM. Used by the page frontmatter (default rent) and its script.
 *
 * Order of preference, kept deliberately simple:
 *   1. Square feet entered (and 1 to 4 bedrooms): sqft x median rent per sq ft for
 *      that bedroom count.
 *   2. Otherwise the bed/bath median, if that combination has 5+ homes.
 *   3. Otherwise the bedroom median.
 *   4. 5+ bedrooms: no estimate. We manage too few homes that size.
 *
 * Every figure is the portfolio's median ASKING rent (Airtable Market Rent).
 * The page labels it an estimate, not an appraisal.
 */
import { rentByBedroom, rentByBedBath, rentPerSqftByBedroom, medianSqftByBedroom } from '../../data/markets';
import { usd } from '../../data/facts';

export const BEDROOM_OPTIONS = ['1', '2', '3', '4', '5+'] as const;
export const BATHROOM_OPTIONS = ['1', '1.5', '2', '2.5', '3', '3.5'] as const;
/** Label for a bathroom option. The top option covers 3.5 and up. */
export const bathLabel = (b: string) => (b === '3.5' ? '3.5+' : b);
/** Square footage below this is treated as blank. The per-sq-ft medians exclude units at or under 200. */
export const MIN_SQFT = 200;

export type RentEstimate =
  | { kind: 'sqft'; rent: number; beds: string; sqft: number; perSqft: number }
  | { kind: 'bedBath'; rent: number; beds: string; baths: string; sample: number }
  | { kind: 'bedroom'; rent: number; beds: string; baths: string; sample: number }
  | { kind: 'none'; beds: string };

export interface PropertyDetails { beds: string; baths: string; sqft?: number }

export function estimateRent({ beds, baths, sqft }: PropertyDetails): RentEstimate {
  const byBed = (rentByBedroom as Record<string, { median: number; sample: number }>)[beds];
  if (!byBed) return { kind: 'none', beds };

  const area = typeof sqft === 'number' && Number.isFinite(sqft) ? sqft : 0;
  const rate = rentPerSqftByBedroom[beds];
  if (area >= MIN_SQFT && rate) {
    return { kind: 'sqft', rent: Math.round(area * rate), beds, sqft: Math.round(area), perSqft: rate };
  }

  const combo = rentByBedBath[beds]?.[baths];
  if (combo && combo.sample >= 5) {
    return { kind: 'bedBath', rent: Math.round(combo.median), beds, baths, sample: combo.sample };
  }
  return { kind: 'bedroom', rent: Math.round(byBed.median), beds, baths, sample: byBed.sample };
}

const perSqftText = (r: number) => `$${(Math.round(r * 100) / 100).toFixed(2)}`;
const n = (x: number) => x.toLocaleString('en-US');

/** One plain sentence describing the estimate and its basis. */
export function describeEstimate(e: RentEstimate): string {
  switch (e.kind) {
    case 'sqft':
      return `About ${usd(e.rent)} for ${n(e.sqft)} sq ft, at our median ${perSqftText(e.perSqft)} per sq ft for ${e.beds} bedroom homes.`;
    case 'bedBath':
      return `Typical rent for a ${e.beds} bed, ${bathLabel(e.baths)} bath home we manage: ${usd(e.rent)} (${n(e.sample)} homes).`;
    case 'bedroom':
      return `Typical rent for a ${e.beds} bed home we manage: ${usd(e.rent)} (${n(e.sample)} homes). We have too few ${e.beds} bed, ${bathLabel(e.baths)} bath homes to price that mix.`;
    case 'none':
      return 'We manage too few homes with 5 or more bedrooms to estimate. Enter your rent.';
  }
}

/** Hint under the square feet field: the bedroom count's median size, as a reference point. */
export function sqftHint(beds: string): string {
  const m = medianSqftByBedroom[beds];
  return m ? `Optional. Our ${beds} bed median is ${n(m)} sq ft.` : 'Optional.';
}
