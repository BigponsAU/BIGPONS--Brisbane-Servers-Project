import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { loadVectors } from '../../../lib/vectors';
import { getSemanticIndexStats } from '../../../lib/semantic/chunk-index';

/**
 * Summary of stored vectors for admin dashboard. Admin only.
 * Primary counts come from the semantic chunk index (Neon); legacy 1D vectors are secondary.
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
    const [legacyEntries, semantic] = await Promise.all([loadVectors(), getSemanticIndexStats()]);
    const legacyByKind = { resource: 0, contribution: 0 };
    legacyEntries.forEach((e) => {
      if (e.kind === 'resource') legacyByKind.resource += 1;
      if (e.kind === 'contribution') legacyByKind.contribution += 1;
    });

    const byKind = {
      resource: semantic.resourceIds,
      contribution: legacyByKind.contribution,
    };

    return new Response(
      JSON.stringify({
        total: semantic.chunkCount,
        byKind,
        semanticIndex: semantic,
        legacyVectors: {
          total: legacyEntries.length,
          byKind: legacyByKind,
        },
        success: true,
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
