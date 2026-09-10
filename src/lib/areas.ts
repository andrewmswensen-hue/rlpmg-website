/**
 * Which area pages actually exist, resolved at build time.
 *
 * The service area is 35 communities but not every one has a page yet, and a
 * link to a page that does not exist sends a reader to a 404 and burns crawl
 * budget on the way. Anything listing areas should therefore link only where a
 * page is really there and render the rest as plain text.
 *
 * The glob is evaluated by Vite at build time, so this list maintains itself:
 * add a page and the link appears, with no register to keep in sync.
 */
const modules = {
  ...import.meta.glob('../pages/property-management-*/index.astro'),
  ...import.meta.glob('../pages/property-management-columbus-ohio/*/index.astro'),
};

export const builtAreaPages: ReadonlySet<string> = new Set(
  Object.keys(modules).map((f) => f.replace('../pages', '').replace(/index\.astro$/, '')),
);

/** True when this path has a real page behind it. */
export const areaPageExists = (url: string) => builtAreaPages.has(url);

/**
 * Split a list of areas into the ones we can link and the ones we can only
 * name. Callers render the second group as text with the coverage line.
 */
export function partitionAreas<T extends { name: string }>(
  items: readonly T[],
  urlOf: (a: T) => string,
): { linked: (T & { href: string })[]; unlinked: T[] } {
  const linked: (T & { href: string })[] = [];
  const unlinked: T[] = [];
  for (const a of items) {
    const href = urlOf(a);
    if (areaPageExists(href)) linked.push({ ...a, href });
    else unlinked.push(a);
  }
  return { linked, unlinked };
}
