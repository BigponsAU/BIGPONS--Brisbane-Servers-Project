import { corsHeaders, json } from '../handlers';
import type { WorkerEnv } from '../env';
import { createOpaqueToken, verifyPassword } from '../lib/auth-crypto';
import { authTokenSetCookie } from '../lib/cookies';
import { createSession, findUserByEmail, isUserEmailVerified, recordAuthAudit, withSql } from '../lib/db';
import { isValidEmail } from '../lib/auth-request';
import { authRateLimitResponse } from '../lib/rate-limit';
import type { AuthUser } from '../lib/types';

const SESSION_MAX_AGE = 24 * 60 * 60;

export async function handleLogin(request: Request, env: WorkerEnv): Promise<Response> {
  const cors = corsHeaders(request.headers.get('origin'));

  const limited = authRateLimitResponse(request, 'auth-login', 10, 15 * 60 * 1000, cors);
  if (limited) return limited;

  if (!env.HYPERDRIVE) {
    return json({ success: false, error: 'Edge auth not configured', code: 'EDGE_AUTH_UNAVAILABLE' }, 503, cors);
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password || !isValidEmail(String(email))) {
      await withSql(env.HYPERDRIVE, (sql) =>
        recordAuthAudit(sql, {
          email: typeof email === 'string' ? email : null,
          eventType: 'auth.login.invalid-request',
        })
      );
      return json(
        { error: 'Email and password are required', code: 'INVALID_REQUEST', success: false },
        400,
        cors
      );
    }

    const adminEmail = env.ADMIN_EMAIL?.trim() ?? '';
    const adminPassword = env.ADMIN_PASSWORD?.trim() ?? '';

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const isSuperAdmin =
        email === adminEmail || (typeof email === 'string' && email.endsWith('@brisbaneservers.com'));
      const user: AuthUser = {
        id: String(email).replace(/@/g, '-').replace(/\./g, '-'),
        email: String(email),
        role: isSuperAdmin ? 'super-admin' : 'admin',
      };
      const token = createOpaqueToken();
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
      await withSql(env.HYPERDRIVE, (sql) => createSession(sql, user, token, expiresAt));
      return json(
        { user, success: true, token, edge: true },
        200,
        { ...cors, 'Set-Cookie': authTokenSetCookie(token, SESSION_MAX_AGE, request) }
      );
    }

    return await withSql(env.HYPERDRIVE, async (sql) => {
      const stored = await findUserByEmail(sql, email);
      if (!stored || !(await verifyPassword(password, stored.passwordHash))) {
        await recordAuthAudit(sql, {
          email: String(email).trim().toLowerCase(),
          eventType: 'auth.login.failed',
        });
        return json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS', success: false }, 401, cors);
      }

      if (!isUserEmailVerified(stored)) {
        await recordAuthAudit(sql, {
          userId: stored.id,
          email: stored.email,
          eventType: 'auth.login.blocked-unverified',
        });
        return json(
          { error: 'Please verify your email before signing in', code: 'EMAIL_NOT_VERIFIED', success: false },
          403,
          cors
        );
      }

      const user: AuthUser = {
        id: stored.id,
        email: stored.email,
        role: stored.role,
        emailVerified: true,
        workspaceEnabled: Boolean(stored.workspaceEnabled),
      };
      const token = createOpaqueToken();
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
      await createSession(sql, user, token, expiresAt);
      await recordAuthAudit(sql, { userId: user.id, email: user.email, eventType: 'auth.login.succeeded' });

      return json(
        { user, success: true, token, edge: true },
        200,
        { ...cors, 'Set-Cookie': authTokenSetCookie(token, SESSION_MAX_AGE, request) }
      );
    });
  } catch {
    if (env.HYPERDRIVE) {
      await withSql(env.HYPERDRIVE, (sql) =>
        recordAuthAudit(sql, { eventType: 'auth.login.error' })
      ).catch(() => undefined);
    }
    return json({ error: 'Invalid request body', code: 'INVALID_REQUEST', success: false }, 400, cors);
  }
}
