import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';

/**
 * Get current user endpoint
 * GET /api/auth/me
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
  
  return new Response(
    JSON.stringify({
      user: authResult.user,
      success: true
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
