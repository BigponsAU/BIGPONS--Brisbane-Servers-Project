import type { APIRoute } from 'astro';
import { requireAdmin } from '~/utils/auth';
import { getSiteReviewSections } from '~/lib/site-review-sections';
import { getPublicSiteBase } from '~/lib/api-config';

export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(JSON.stringify({ error: authResult.error, code: authResult.code, success: false }), {
      status: authResult.code === 'FORBIDDEN' ? 403 : 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const siteBase = getPublicSiteBase();
  const sections = getSiteReviewSections().map((section) => ({
    ...section,
    href: siteBase === '/' ? section.path : `${siteBase.replace(/\/$/, '')}${section.path}`
  }));

  return new Response(
    JSON.stringify({ success: true, count: sections.length, sections }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
