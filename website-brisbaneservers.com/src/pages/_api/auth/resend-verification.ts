import type { APIRoute } from 'astro';
import { sendVerificationEmail } from '../../../lib/auth-flows';
import { authRateLimitResponse } from '../../../lib/auth-rate-limit';
import { findUserByEmail, isUserEmailVerified } from '../../../lib/db/users';
import { isValidEmail } from '../../../utils/error-handling';
import { logAuthEvent } from '../../../lib/auth-audit';

const GENERIC_SUCCESS = {
  success: true,
  message: 'If that account can be verified, a verification email has been sent.'
};

export const POST: APIRoute = async ({ request }) => {
  const limited = authRateLimitResponse(request, 'auth-resend-verification', 5, 15 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!isValidEmail(email)) {
      await logAuthEvent({ email, eventType: 'auth.resend-verification.invalid-email' });
      return new Response(
        JSON.stringify({ error: 'Please provide a valid email address', code: 'INVALID_EMAIL', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await findUserByEmail(email);
    if (user && !isUserEmailVerified(user)) {
      let delivery;
      try {
        delivery = await sendVerificationEmail(request, { id: user.id, email: user.email });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Email delivery failed';
        await logAuthEvent({
          userId: user.id,
          email: user.email,
          eventType: 'auth.resend-verification.failed',
          eventMeta: { message }
        });
        return new Response(
          JSON.stringify({
            success: false,
            code: 'VERIFICATION_EMAIL_FAILED',
            error:
              'Could not send verification email right now. Please try again shortly or contact support if this persists.'
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      await logAuthEvent({
        userId: user.id,
        email: user.email,
        eventType: 'auth.resend-verification.sent',
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

    await logAuthEvent({ email, eventType: 'auth.resend-verification.requested-ignored' });
    return new Response(JSON.stringify(GENERIC_SUCCESS), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logAuthEvent({ eventType: 'auth.resend-verification.error', eventMeta: { message } });
    return new Response(
      JSON.stringify({
        success: false,
        code: 'INTERNAL_ERROR',
        error: 'Verification request failed. Please try again.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
