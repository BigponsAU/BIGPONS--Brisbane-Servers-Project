import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { computeAnalyticsSuggestions } from '../../../lib/analytics';

/**
 * Analytics suggestions for admins.
 * GET /api/analytics/suggestions
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);

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
    const { summary, config, suggestions } = await computeAnalyticsSuggestions();

    return new Response(
      JSON.stringify({
        summary,
        config,
        suggestions,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] GET /api/analytics/suggestions - Error:', error);
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

