import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../utils/auth';
import { buildAdminUsageSummary } from '../../../../lib/inference/admin-usage-summary';

/**
 * Site-wide daily AI usage summary for admin billing/ops panels.
 * GET /api/admin/usage/summary
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const summary = await buildAdminUsageSummary();
    return new Response(JSON.stringify({ success: true, ...summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
