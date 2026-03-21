import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const base = (import.meta.env.SITE ?? 'https://brisbaneservers.com').replace(/\/$/, '');
  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
