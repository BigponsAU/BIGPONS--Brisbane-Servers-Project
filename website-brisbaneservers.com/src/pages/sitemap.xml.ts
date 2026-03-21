import type { APIRoute } from 'astro';
import { industries } from '../data/industries';

/** Marketing and public content only (portal is noindex; dynamic resource items omitted). */
const STATIC_PATHS = [
  '/',
  '/about',
  '/services',
  '/resources',
  '/projects',
  '/contribute',
  '/privacy-policy',
  '/terms-of-service',
  '/case-studies/healthcare-patient-management',
  '/case-studies/professional-services-database',
  '/case-studies/retail-inventory-ecommerce',
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = () => {
  const base = (import.meta.env.SITE ?? 'https://brisbaneservers.com').replace(/\/$/, '');
  const paths = new Set<string>(STATIC_PATHS);

  for (const ind of industries) {
    paths.add(`/resources/${ind.slug}`);
    for (const t of ind.topics) {
      paths.add(`/resources/${ind.slug}/${t.slug}`);
    }
  }

  const sorted = [...paths].sort((a, b) => a.localeCompare(b));
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sorted.map((p) => `  <url><loc>${xmlEscape(base + p)}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
