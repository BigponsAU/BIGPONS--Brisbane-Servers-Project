import type { APIRoute } from 'astro';
import { createSessionToken, hashPassword, type AuthUser } from '../../../utils/auth';
import { createUser, findUserByEmail } from '../../../lib/db/users';
import { createSession } from '../../../lib/db/sessions';
import { authTokenSetCookie } from '../../../utils/http-cookies';

const SESSION_MAX_AGE = 24 * 60 * 60;

/**
 * Register a new user (client role). Optionally logs in and returns token.
 * POST /api/auth/register
 * Body: { email: string, password: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
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
    if (trimmed.length < 3) {
      return new Response(
        JSON.stringify({
          error: 'Email must be at least 3 characters',
          code: 'INVALID_EMAIL',
          success: false
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (password.length < 8) {
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

    const user: AuthUser = { id: stored.id, email: stored.email, role: stored.role };
    const token = createSessionToken(user);
    await createSession(user, token);

    return new Response(
      JSON.stringify({
        token,
        user,
        success: true
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': authTokenSetCookie(token, SESSION_MAX_AGE, request)
        }
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
