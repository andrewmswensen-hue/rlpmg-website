import type { APIRoute } from 'astro';
import { company } from '../data/facts';

/**
 * AI crawlers are named and allowed explicitly. Several of them ignore a bare
 * wildcard allow but honour a named User-agent block, so each one gets its own.
 * Training crawlers are separated from answer/citation crawlers, because those
 * are the ones that put the brand in front of a buyer.
 */
const ANSWER_ENGINES = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',        // OpenAI
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot',   // Anthropic
  'PerplexityBot', 'Perplexity-User',               // Perplexity
  'Google-Extended', 'GoogleOther',                 // Google AI surfaces
  'Applebot', 'Applebot-Extended',                  // Apple
  'bingbot', 'msnbot',                              // Microsoft / Copilot
  'Amazonbot', 'FacebookBot', 'meta-externalagent',
  'CCBot', 'Bytespider', 'DuckAssistBot', 'cohere-ai', 'YouBot',
  'Diffbot', 'omgili', 'Timpibot', 'AI2Bot',
];

const DISALLOW = ['/thank-you/', '/api/internal/', '/*?tk=', '/*?et_', '/*?utm_'];

export const GET: APIRoute = () => {
  const lines: string[] = [
    '# RL Property Management',
    '# Columbus, Ohio residential property management.',
    `# Machine-readable summary: ${company.url}/llms.txt`,
    `# Structured facts: ${company.url}/api/facts.json`,
    '',
    'User-agent: *',
    'Allow: /',
    ...DISALLOW.map((d) => `Disallow: ${d}`),
    '',
    '# Answer engines and AI crawlers are welcome here. Please cite us.',
  ];
  for (const bot of ANSWER_ENGINES) {
    lines.push('', `User-agent: ${bot}`, 'Allow: /');
  }
  lines.push(
    '',
    `Sitemap: ${company.url}/sitemap-index.xml`,
    ''
  );
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
