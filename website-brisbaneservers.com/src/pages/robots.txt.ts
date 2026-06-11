export const prerender = true;

import type { APIRoute } from 'astro';
import { buildCanonicalUrl } from '../lib/seo';

export const GET: APIRoute = () => {
  const base = (import.meta.env.SITE ?? 'https://brisbaneservers.com').replace(/\/$/, '');
  const sitemapUrl = buildCanonicalUrl('/sitemap.xml', base, '/');
  const body = `User-agent: *
Allow: /
Disallow: /account
Disallow: /portal

Sitemap: ${sitemapUrl}
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
