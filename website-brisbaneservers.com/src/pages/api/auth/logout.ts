import type { APIRoute } from 'astro';
import { getTokenFromRequest, requireAuth } from '../../../utils/auth';
import { deleteSession } from '../../../lib/db/sessions';

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
export const POST: APIRoute = async ({ request }) => {
  const token = getTokenFromRequest(request);
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
  if (token) await deleteSession(token);
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'authToken=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
      }
    }
  );
};
