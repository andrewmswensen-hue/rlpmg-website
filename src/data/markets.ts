/**
 * Per-market data for the area pages.
 *
 * DELIBERATELY CONTAINS NO DOOR COUNTS. Two reasons:
 *   1. Per-market door counts are never published (see docs/area-page-strategy.md).
 *      Publishing them advertises where we are thin and goes stale weekly.
 *   2. They are internal portfolio data and this repository may be public.
 *
 * What survives is what the pages actually render: a tier, which decides how deep
 * a page goes, and rent medians, which are only present where the sample is 5 or
 * more units and are therefore defensible to publish.
 *
 * Regenerate with source/build-markets.py after an Airtable refresh.
 * Generated 2026-09-09.
 */

/**
 * anchor   Columbus. The hub, with neighborhood children.
 * depth    We manage enough here to publish our own rent medians.
 * present  We operate here. Sample too small for our own medians, use cited market data.
 * coverage We serve this area and will take on property here. No units today.
 */
export type MarketTier = 'anchor' | 'depth' | 'present' | 'coverage';

export interface Market { city: string; tier: MarketTier }

export const markets: Market[] = [
  { city: "Columbus", tier: 'anchor' },
  { city: "Dublin", tier: 'depth' },
  { city: "Upper Arlington", tier: 'present' },
  { city: "Westerville", tier: 'depth' },
  { city: "Worthington", tier: 'depth' },
  { city: "Gahanna", tier: 'depth' },
  { city: "Hilliard", tier: 'depth' },
  { city: "Powell", tier: 'depth' },
  { city: "Reynoldsburg", tier: 'depth' },
  { city: "Canal Winchester", tier: 'depth' },
  { city: "New Albany", tier: 'depth' },
  { city: "Bexley", tier: 'coverage' },
  { city: "Grove City", tier: 'depth' },
  { city: "Pickerington", tier: 'present' },
  { city: "Clintonville", tier: 'coverage' },
  { city: "German Village", tier: 'coverage' },
  { city: "Short North", tier: 'coverage' },
  { city: "Grandview Heights", tier: 'depth' },
  { city: "Blacklick", tier: 'depth' },
  { city: "Delaware", tier: 'present' },
  { city: "Marysville", tier: 'coverage' },
  { city: "Lancaster", tier: 'coverage' },
  { city: "Newark", tier: 'present' },
  { city: "London", tier: 'coverage' },
  { city: "Ashville", tier: 'coverage' },
  { city: "Lewis Center", tier: 'depth' },
  { city: "Pataskala", tier: 'depth' },
  { city: "Galloway", tier: 'depth' },
  { city: "Johnstown", tier: 'present' },
  { city: "Groveport", tier: 'present' },
  { city: "Whitehall", tier: 'present' },
  { city: "Commercial Point", tier: 'present' },
  { city: "Plain City", tier: 'present' },
  { city: "South Bloomfield", tier: 'present' },
  { city: "Granville", tier: 'coverage' },
];

/** Portfolio-wide median rent by bedroom. Publishable. */
export const rentByBedroom = {
  '1': { median: 1100, sample: 46 },
  '2': { median: 1300, sample: 237 },
  '3': { median: 1708, sample: 292 },
  '4': { median: 2450, sample: 89 },
} as const;

/**
 * Median rent by market and bedroom, only where 5 or more units support it.
 * Render these as "across the units we manage in <city>". Anything not in here
 * must use cited public market data instead, never presented as ours.
 */
export const rentByMarketAndBedroom: Record<string, Record<string, { median: number; sample: number }>> = {
  "Canal Winchester": {
    "2": {
      "median": 1449,
      "sample": 5
    },
    "3": {
      "median": 1890,
      "sample": 8
    }
  },
  "Columbus": {
    "2": {
      "median": 1240,
      "sample": 176
    },
    "3": {
      "median": 1574,
      "sample": 181
    },
    "1": {
      "median": 966,
      "sample": 32
    },
    "4": {
      "median": 2107,
      "sample": 36
    }
  },
  "Dublin": {
    "3": {
      "median": 2637,
      "sample": 14
    },
    "4": {
      "median": 3200,
      "sample": 5
    }
  },
  "Galloway": {
    "3": {
      "median": 1885,
      "sample": 7
    }
  },
  "Grandview Heights": {
    "1": {
      "median": 1255,
      "sample": 10
    }
  },
  "Grove City": {
    "3": {
      "median": 1845,
      "sample": 9
    },
    "4": {
      "median": 2549,
      "sample": 5
    }
  },
  "Hilliard": {
    "3": {
      "median": 2070,
      "sample": 10
    }
  },
  "Powell": {
    "2": {
      "median": 1328,
      "sample": 8
    }
  },
  "Reynoldsburg": {
    "3": {
      "median": 1567,
      "sample": 16
    },
    "2": {
      "median": 1096,
      "sample": 7
    }
  },
  "Westerville": {
    "4": {
      "median": 2649,
      "sample": 7
    },
    "3": {
      "median": 1972,
      "sample": 6
    }
  },
  "Worthington": {
    "3": {
      "median": 1805,
      "sample": 5
    }
  }
};

export const canPublishOwnRent = (city: string) => city in rentByMarketAndBedroom;
