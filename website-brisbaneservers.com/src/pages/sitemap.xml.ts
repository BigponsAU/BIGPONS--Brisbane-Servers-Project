import type { APIRoute } from 'astro';

export const prerender = false;

import { buildStaticSitemapEntries } from '../lib/content-registry';
import { getPublishedResourcesForPage } from '../lib/public-published-resources';
import { buildCanonicalUrl, toSitemapLastmod } from '../lib/seo';

type SitemapEntry = {
  path: string;
  lastmod?: string;
};

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatUrlEntry(base: string, entry: SitemapEntry): string {
  const loc = xmlEscape(buildCanonicalUrl(entry.path, base, '/'));
  const lastmod = entry.lastmod ? `\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmod}\n  </url>`;
}

export const GET: APIRoute = async () => {
  const base = (import.meta.env.SITE ?? 'https://brisbaneservers.com').replace(/\/$/, '');
  const buildLastmod = toSitemapLastmod(new Date())!;
  const publishedResources = await getPublishedResourcesForPage();
  const entries = buildStaticSitemapEntries(buildLastmod, publishedResources);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => formatUrlEntry(base, entry)).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
