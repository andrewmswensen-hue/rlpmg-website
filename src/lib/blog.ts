import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** Category names in the frontmatter are display names. URLs use slugs. */
export const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export async function allPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/**
 * Fit a meta description to what a search result actually displays.
 * Cuts at a sentence end where one is close to the limit, otherwise at a word.
 */
export const metaDescription = (text: string, len = 155) => {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= len) return t;
  const cut = t.slice(0, len);
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (sentence > len * 0.6) return cut.slice(0, sentence + 1);
  const word = cut.lastIndexOf(' ');
  return cut.slice(0, word > 0 ? word : len).replace(/[,;:]$/, '') + '...';
};

/**
 * Build a page title that fits.
 *
 * Append the brand only when the whole thing still fits inside the roughly 60
 * characters Google shows. On a long article headline the brand is the least
 * useful part, so it is the part that goes.
 */
export const pageTitle = (title: string, brand: string, max = 60) => {
  const full = `${title} | ${brand}`;
  return full.length <= max ? full : title;
};

/**
 * Trim a title that already has the brand baked into it.
 *
 * Most static pages were written as "Thing in Columbus | RL Property Management",
 * which reads well but runs past the roughly 60 characters Google shows, and the
 * part that gets cut is always the brand. So when the whole thing does not fit,
 * drop the trailing brand segment rather than let the search result end in an
 * ellipsis. If it still does not fit, leave it alone: that one needs a human.
 */
export const fitTitle = (title: string, max = 60) => {
  if (title.length <= max) return title;
  const trimmed = title.replace(/\s*\|\s*(RL Property Management|RLPM)\b[^|]*$/, '').trim();
  return trimmed.length && trimmed.length <= max ? trimmed : title;
};

/** Category slug to display name, built from what the posts actually carry. */
export async function categoryIndex() {
  const posts = await allPosts();
  const map = new Map<string, { name: string; posts: Post[] }>();
  for (const p of posts) {
    for (const c of p.data.categories) {
      const s = slugify(c);
      if (!map.has(s)) map.set(s, { name: c, posts: [] });
      map.get(s)!.posts.push(p);
    }
  }
  return map;
}

/**
 * Related posts: same category first, most recent, then fill from the newest
 * remaining posts so the block is never short.
 */
export function related(post: Post, all: Post[], n = 4): Post[] {
  const cats = new Set(post.data.categories);
  const sameCat = all.filter(
    (p) => p.id !== post.id && p.data.categories.some((c) => cats.has(c)),
  );
  const rest = all.filter((p) => p.id !== post.id && !sameCat.includes(p));
  return [...sameCat, ...rest].slice(0, n);
}

/**
 * Strip markdown so an excerpt reads cleanly.
 *
 * Default length is 155 because Google truncates a description around 155 to 160
 * characters, and anything past that is invisible in the result. Truncation is at
 * a word boundary, never mid-word.
 */
export const excerpt = (body: string, len = 155) => {
  const t = body
    .replace(/^---[\s\S]*?---/, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\{\{youtube:[^}]*\}\}/g, '')
    .replace(/[#*_`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > len ? t.slice(0, t.lastIndexOf(' ', len)) + '...' : t;
};
