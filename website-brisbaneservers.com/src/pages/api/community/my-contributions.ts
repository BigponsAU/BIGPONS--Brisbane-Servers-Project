import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import { getUserContributions } from '../../../lib/contributions';

/**
 * Get contributions for the current user.
 * GET /api/community/my-contributions
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);

  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const user = authResult.user;
    const contributions = await getUserContributions(user.id);

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

