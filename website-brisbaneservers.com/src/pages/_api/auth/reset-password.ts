import type { APIRoute } from 'astro';
import { consumeAuthToken } from '../../../lib/db/auth-tokens';
import { deleteSessionsForUser } from '../../../lib/db/sessions';
import { findUserById, updateUserPasswordHash } from '../../../lib/db/users';
import { authRateLimitResponse } from '../../../lib/auth-rate-limit';
import { hashPassword } from '../../../utils/auth';
import { logAuthEvent } from '../../../lib/auth-audit';

export const POST: APIRoute = async ({ request }) => {
  const limited = authRateLimitResponse(request, 'auth-reset-password', 5, 15 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!token || !password) {
      await logAuthEvent({ eventType: 'auth.reset-password.invalid-request' });
      return new Response(
        JSON.stringify({ error: 'Token and password are required', code: 'MISSING_FIELDS', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 8) {
      await logAuthEvent({ eventType: 'auth.reset-password.weak-password' });
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters', code: 'INVALID_PASSWORD', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const record = await consumeAuthToken(token, 'password-reset');
    if (!record) {
      await logAuthEvent({ eventType: 'auth.reset-password.invalid-token' });
      return new Response(
        JSON.stringify({ error: 'Reset link is invalid or expired', code: 'INVALID_TOKEN', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await findUserById(record.userId);
    if (!user) {
      await logAuthEvent({ userId: record.userId, email: record.email, eventType: 'auth.reset-password.user-not-found' });
      return new Response(
        JSON.stringify({ error: 'User not found', code: 'USER_NOT_FOUND', success: false }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await updateUserPasswordHash(user.id, hashPassword(password));
    await deleteSessionsForUser(user.id);
    await logAuthEvent({ userId: user.id, email: user.email, eventType: 'auth.reset-password.succeeded' });

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated. You can now sign in with your new password.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body', code: 'INVALID_REQUEST', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
