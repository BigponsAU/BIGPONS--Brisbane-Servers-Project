import type { APIRoute } from 'astro';
import { sendPasswordResetEmail } from '../../../lib/auth-flows';
import { authRateLimitResponse } from '../../../lib/auth-rate-limit';
import { findUserByEmail, isUserEmailVerified } from '../../../lib/db/users';
import { isValidEmail } from '../../../utils/error-handling';
import { logAuthEvent } from '../../../lib/auth-audit';

const GENERIC_SUCCESS = {
  success: true,
  message: 'If that account exists, a password reset link has been sent.'
};

export const POST: APIRoute = async ({ request }) => {
  const limited = authRateLimitResponse(request, 'auth-forgot-password', 5, 15 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!isValidEmail(email)) {
      await logAuthEvent({ email, eventType: 'auth.forgot-password.invalid-email' });
      return new Response(
        JSON.stringify({ error: 'Please provide a valid email address', code: 'INVALID_EMAIL', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await findUserByEmail(email);
    if (user && isUserEmailVerified(user)) {
      const delivery = await sendPasswordResetEmail(request, { id: user.id, email: user.email });
      await logAuthEvent({
        userId: user.id,
        email: user.email,
        eventType: 'auth.forgot-password.sent',
        eventMeta: { deliveryMode: delivery.deliveryMode }
      });
      return new Response(
        JSON.stringify({
          ...GENERIC_SUCCESS,
          deliveryMode: delivery.deliveryMode,
          previewUrl: delivery.previewUrl
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await logAuthEvent({ email, eventType: 'auth.forgot-password.requested-unknown' });
    return new Response(JSON.stringify(GENERIC_SUCCESS), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify(GENERIC_SUCCESS), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
