import type { APIRoute } from 'astro';
import { hashPassword } from '../../../utils/auth';
import { createUser, deleteUserById, findUserByEmail } from '../../../lib/db/users';
import { sendVerificationEmail } from '../../../lib/auth-flows';
import { authRateLimitResponse } from '../../../lib/auth-rate-limit';
import { isValidEmail } from '../../../utils/error-handling';
import { logAuthEvent } from '../../../lib/auth-audit';

/**
 * Register a new user (client role) and require email verification before sign-in.
 * POST /api/auth/register
 * Body: { email: string, password: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const limited = authRateLimitResponse(request, 'auth-register', 5, 15 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      await logAuthEvent({ email: typeof email === 'string' ? email : null, eventType: 'auth.register.invalid-request' });
      return new Response(
        JSON.stringify({
          error: 'Email and password are required',
          code: 'MISSING_FIELDS',
          success: false
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      await logAuthEvent({ email: trimmed, eventType: 'auth.register.invalid-email' });
      return new Response(
        JSON.stringify({
          error: 'Please provide a valid email address',
          code: 'INVALID_EMAIL',
          success: false
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (password.length < 8) {
      await logAuthEvent({ email: trimmed, eventType: 'auth.register.weak-password' });
      return new Response(
        JSON.stringify({
          error: 'Password must be at least 8 characters',
          code: 'INVALID_PASSWORD',
          success: false
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existing = await findUserByEmail(trimmed);
    if (existing) {
      await logAuthEvent({ userId: existing.id, email: existing.email, eventType: 'auth.register.duplicate-email' });
      return new Response(
        JSON.stringify({
          error: 'An account with this email already exists',
          code: 'EMAIL_IN_USE',
          success: false
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const passwordHash = hashPassword(password);
    const stored = await createUser(trimmed, passwordHash, 'client');
    let delivery;
    try {
      delivery = await sendVerificationEmail(request, { id: stored.id, email: stored.email });
    } catch (error) {
      await deleteUserById(stored.id);
      await logAuthEvent({ userId: stored.id, email: stored.email, eventType: 'auth.register.email-delivery-failed' });
      throw error;
    }
    await logAuthEvent({
      userId: stored.id,
      email: stored.email,
      eventType: 'auth.register.created',
      eventMeta: { deliveryMode: delivery.deliveryMode }
    });

    return new Response(
      JSON.stringify({
        message: 'Account created. Check your email to verify your account before signing in.',
        deliveryMode: delivery.deliveryMode,
        previewUrl: delivery.previewUrl,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    await logAuthEvent({ eventType: 'auth.register.error', eventMeta: { message } });
    return new Response(
      JSON.stringify({
        error: message === 'AUTH_EMAIL_NOT_CONFIGURED'
          ? 'Account email delivery is not configured. Please contact support before enabling registration.'
          : message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
