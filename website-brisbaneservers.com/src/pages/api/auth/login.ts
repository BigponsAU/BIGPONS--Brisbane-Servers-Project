import type { APIRoute } from 'astro';
import { createSessionToken, verifyPassword, type AuthUser } from '../../../utils/auth';
import { findUserByEmail } from '../../../lib/db/users';
import { createSession } from '../../../lib/db/sessions';

const SESSION_MAX_AGE = 24 * 60 * 60;

/**
 * Login: env admin first, then DB users. Persists session for DB users.
 * POST /api/auth/login
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          error: 'Email and password are required',
          code: 'INVALID_REQUEST',
          success: false
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ADMIN_EMAIL =
      import.meta.env.ADMIN_EMAIL ||
      (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) ||
      'admin@brisbaneservers.com';
    const ADMIN_PASSWORD =
      import.meta.env.ADMIN_PASSWORD ||
      (typeof process !== 'undefined' && process.env?.ADMIN_PASSWORD) ||
      'admin123';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
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
            'Set-Cookie': `authToken=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`
          }
        }
      );
    }

    const stored = await findUserByEmail(email);
    if (!stored || !verifyPassword(password, stored.passwordHash)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          success: false
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user: AuthUser = { id: stored.id, email: stored.email, role: stored.role };
    const token = createSessionToken(user);
    await createSession(user, token);

    return new Response(
      JSON.stringify({ token, user, success: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `authToken=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`
        }
      }
    );
  } catch (error) {
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
