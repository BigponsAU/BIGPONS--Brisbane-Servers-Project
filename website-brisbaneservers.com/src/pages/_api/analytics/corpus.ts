import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { computeCorpusAnalytics } from '../../../lib/analytics';

/**
 * Corpus analytics for Insights panel (editor+).
 * Coverage gaps, contribution funnel, topic table, semantic index health.
 * GET /api/analytics/corpus
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireEditor(request);

  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const analytics = await computeCorpusAnalytics();

    return new Response(
      JSON.stringify({
        ...analytics,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] GET /api/analytics/corpus - Error:', error);
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
