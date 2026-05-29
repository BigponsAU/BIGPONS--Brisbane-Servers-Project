import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { loadContributions } from '../../../lib/contributions';

/**
 * List all contributions for moderation/analytics.
 * GET /api/community/contributions
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
    const contributions = await loadContributions();

    return new Response(
      JSON.stringify({
        contributions,
        count: contributions.length,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
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

