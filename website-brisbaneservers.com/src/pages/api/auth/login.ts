import type { APIRoute } from 'astro';
import { createSessionToken, verifyPassword, type AuthUser } from '../../../utils/auth';
import { findUserByEmail, isUserEmailVerified } from '../../../lib/db/users';
import { createSession } from '../../../lib/db/sessions';
import { authTokenSetCookie } from '../../../utils/http-cookies';
import { getRuntimeEnv } from '../../../utils/runtime-env';
import { authRateLimitResponse } from '../../../lib/auth-rate-limit';
import { isValidEmail } from '../../../utils/error-handling';
import { logAuthEvent } from '../../../lib/auth-audit';

const SESSION_MAX_AGE = 24 * 60 * 60;

/**
 * Login: optional env-configured bootstrap admin (both ADMIN_EMAIL + ADMIN_PASSWORD),
 * then DB users. No hardcoded credentials — set secrets in `.env` / hosting panel.
 * Persists session for DB users.
 * POST /api/auth/login
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const limited = authRateLimitResponse(request, 'auth-login', 10, 15 * 60 * 1000);
    if (limited) return limited;

    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password || !isValidEmail(String(email))) {
      await logAuthEvent({ email: typeof email === 'string' ? email : null, eventType: 'auth.login.invalid-request' });
      return new Response(
        JSON.stringify({
          error: 'Email and password are required',
          code: 'INVALID_REQUEST',
          success: false
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ADMIN_EMAIL = getRuntimeEnv('ADMIN_EMAIL') ?? '';
    const ADMIN_PASSWORD = getRuntimeEnv('ADMIN_PASSWORD') ?? '';

    if (
      ADMIN_EMAIL &&
      ADMIN_PASSWORD &&
      email === ADMIN_EMAIL &&
      password === ADMIN_PASSWORD
    ) {
      const isSuperAdmin =
        email === ADMIN_EMAIL || (typeof email === 'string' && email.endsWith('@brisbaneservers.com'));
      const user: AuthUser = {
        id: String(email).replace(/@/g, '-').replace(/\./g, '-'),
        email: String(email),
        role: isSuperAdmin ? 'super-admin' : 'admin'
      };
      const token = createSessionToken(user);
      return new Response(
        JSON.stringify({ token, user, success: true }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': authTokenSetCookie(token, SESSION_MAX_AGE, request)
          }
        }
      );
    }

    const stored = await findUserByEmail(email);
    if (!stored || !verifyPassword(password, stored.passwordHash)) {
      await logAuthEvent({ email: String(email).trim().toLowerCase(), eventType: 'auth.login.failed' });
      return new Response(
        JSON.stringify({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          success: false
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isUserEmailVerified(stored)) {
      await logAuthEvent({ userId: stored.id, email: stored.email, eventType: 'auth.login.blocked-unverified' });
      return new Response(
        JSON.stringify({
          error: 'Please verify your email before signing in',
          code: 'EMAIL_NOT_VERIFIED',
          success: false
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user: AuthUser = {
      id: stored.id,
      email: stored.email,
      role: stored.role,
      emailVerified: true
    };
    const token = createSessionToken(user);
    await createSession(user, token);
    await logAuthEvent({ userId: user.id, email: user.email, eventType: 'auth.login.succeeded' });

    return new Response(
      JSON.stringify({ token, user, success: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': authTokenSetCookie(token, SESSION_MAX_AGE, request)
        }
      }
    );
  } catch (error) {
    await logAuthEvent({ eventType: 'auth.login.error' });
    return new Response(
      JSON.stringify({
        error: 'Invalid request body',
        code: 'INVALID_REQUEST',
        success: false
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
