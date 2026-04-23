import type { APIRoute } from 'astro';
import { getTokenFromRequest, requireAuth } from '../../../utils/auth';
import { deleteSession } from '../../../lib/db/sessions';
import { authTokenClearCookie } from '../../../utils/http-cookies';
import { logAuthEvent } from '../../../lib/auth-audit';

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
export const POST: APIRoute = async ({ request }) => {
  const token = getTokenFromRequest(request);
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    await logAuthEvent({ eventType: 'auth.logout.unauthorized' });
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
  await logAuthEvent({ userId: authResult.user.id, email: authResult.user.email, eventType: 'auth.logout.succeeded' });
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': authTokenClearCookie(request)
      }
    }
  );
};
