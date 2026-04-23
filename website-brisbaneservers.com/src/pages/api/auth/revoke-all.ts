import type { APIRoute } from 'astro';
import { deleteSessionsForUser } from '../../../lib/db/sessions';
import { requireAuth } from '../../../utils/auth';
import { authTokenClearCookie } from '../../../utils/http-cookies';
import { logAuthEvent } from '../../../lib/auth-audit';

export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  await deleteSessionsForUser(authResult.user.id);
  await logAuthEvent({
    userId: authResult.user.id,
    email: authResult.user.email,
    eventType: 'auth.sessions.revoked-all'
  });

  return new Response(
    JSON.stringify({ success: true, message: 'All sessions revoked. Please sign in again.' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': authTokenClearCookie(request)
      }
    }
  );
};
