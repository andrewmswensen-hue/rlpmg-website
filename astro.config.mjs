// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { redirects } from './src/data/redirects.mjs';

export default defineConfig({
  site: 'https://rlpmg.com',
  trailingSlash: 'always',
  redirects,
  build: { format: 'directory', inlineStylesheets: 'auto' },
  image: { responsiveStyles: true },
  integrations: [
    sitemap({
      filter: (page) => !/\/(max-investment|rent-mag|thank-you|weekly-policy-updates-unsubscribe-confirmed)\//.test(page),
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
