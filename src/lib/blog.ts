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

/** Strip markdown so an excerpt reads cleanly. */
export const excerpt = (body: string, len = 165) => {
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
