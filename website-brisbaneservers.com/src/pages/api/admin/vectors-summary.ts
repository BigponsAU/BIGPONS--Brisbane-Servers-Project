import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { loadVectors } from '../../../lib/vectors';
import { getSemanticIndexStats } from '../../../lib/semantic/chunk-index';

/**
 * Summary of stored vectors for admin dashboard. Admin only.
 * GET /api/admin/vectors-summary
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
    const entries = await loadVectors();
    const semantic = await getSemanticIndexStats();
    const byKind = { resource: 0, contribution: 0 };
    entries.forEach((e) => {
      if (e.kind === 'resource') byKind.resource += 1;
      if (e.kind === 'contribution') byKind.contribution += 1;
    });
    return new Response(
      JSON.stringify({
        total: entries.length,
        byKind,
        semanticIndex: semantic,
        success: true
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
