import type { APIRoute } from 'astro';
import { consumeAuthToken } from '../../../lib/db/auth-tokens';
import { findUserById, markUserEmailVerified } from '../../../lib/db/users';
import { authRateLimitResponse } from '../../../lib/auth-rate-limit';
import { logAuthEvent } from '../../../lib/auth-audit';

export const GET: APIRoute = async ({ request }) => {
  const limited = authRateLimitResponse(request, 'auth-verify-email', 15, 15 * 60 * 1000);
  if (limited) return limited;

  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    await logAuthEvent({ eventType: 'auth.verify-email.missing-token' });
    return new Response(
      JSON.stringify({ error: 'Verification token is required', code: 'MISSING_TOKEN', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const record = await consumeAuthToken(token, 'email-verify');
  if (!record) {
    await logAuthEvent({ eventType: 'auth.verify-email.invalid-token' });
    return new Response(
      JSON.stringify({ error: 'Verification link is invalid or expired', code: 'INVALID_TOKEN', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const user = await findUserById(record.userId);
  if (!user) {
    await logAuthEvent({ userId: record.userId, email: record.email, eventType: 'auth.verify-email.user-not-found' });
    return new Response(
      JSON.stringify({ error: 'User not found', code: 'USER_NOT_FOUND', success: false }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  await markUserEmailVerified(user.id);
  await logAuthEvent({ userId: user.id, email: user.email, eventType: 'auth.verify-email.succeeded' });
  return new Response(
    JSON.stringify({
      success: true,
      email: user.email,
      message: 'Your email has been verified. You can now sign in with your email and password.'
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
