import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import { findUserById, isUserEmailVerified } from '../../../lib/db/users';

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
  
  const stored = await findUserById(authResult.user.id).catch(() => null);
  const user = stored
    ? { ...authResult.user, emailVerified: isUserEmailVerified(stored) }
    : authResult.user;

  return new Response(
    JSON.stringify({
      user,
      success: true
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
