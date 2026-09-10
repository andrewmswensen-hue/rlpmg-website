import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { company } from '../data/facts';

export async function GET(context: APIContext) {
  // Cap the feed. 384 posts would be a ~300KB download on every poll, and no
  // reader needs eight years of archive in a feed.
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, 50);

  return rss({
    title: `${company.name} blog`,
    description:
      'Practical guidance for rental property owners and investors in the Columbus, Ohio metro, from a licensed Ohio brokerage.',
    site: context.site ?? company.url,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: `/blog/${p.data.slug}/`,
      categories: p.data.categories,
    })),
    customData: '<language>en-us</language>',
  });
}
