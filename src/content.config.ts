import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** The 384 posts migrated from WordPress on 2026-09-09. URLs stay unchanged. */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    /**
     * Search-result title. The <title> tag only. Never rendered as the H1.
     *
     * Peter's headlines are written to be read, and many run past the roughly
     * 60 characters Google shows, so they get cut mid-word in the results.
     * This field carries a short, front-loaded version for search while the
     * post keeps the headline he wrote. URLs and H1s are untouched.
     */
    seoTitle: z.string().optional(),
    description: z.string().default(''),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    slug: z.string(),
    wpId: z.number().optional(),
    heroImage: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

/** One entry per community we serve. Each needs real local substance. */
const cities = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/cities' }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    county: z.string(),
    url: z.string(),
    directAnswer: z.string(),
    keyFacts: z.array(z.string()),
    lastVerified: z.coerce.date(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

/** Questions reused across pages, /api/faqs.json and FAQPage schema. */
const faqs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faqs' }),
  schema: z.object({
    question: z.string(),
    audience: z.enum(['owner', 'resident', 'vendor', 'agent']),
    topic: z.string(),
    order: z.number().default(100),
    lastVerified: z.coerce.date(),
  }),
});

export const collections = { blog, cities, faqs };
