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
    // Still clear the HttpOnly cookie so stale sessions do not block the next sign-in.
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signed out (session was already invalid)'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': authTokenClearCookie(request)
        }
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
