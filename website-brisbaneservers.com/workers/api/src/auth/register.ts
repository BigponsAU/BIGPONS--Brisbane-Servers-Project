import { corsHeaders, json } from '../handlers';
import type { WorkerEnv } from '../env';
import { createOpaqueToken, hashPassword, sha256Hex } from '../lib/auth-crypto';
import { sendVerificationEmail } from '../lib/auth-email';
import {
  createUser,
  findUserByEmail,
  pruneAuthTokens,
  recordAuthAudit,
  replaceActiveAuthToken,
  withSql,
} from '../lib/db';
import { isValidEmail } from '../lib/auth-request';
import { authRateLimitResponse } from '../lib/rate-limit';
import type { StoredAuthToken } from '../lib/types';

const REGISTER_DUPLICATE_MESSAGE =
  'If that email is eligible for an account, sign in or use forgot password to continue. Otherwise check your inbox for a verification link.';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export async function handleRegister(request: Request, env: WorkerEnv): Promise<Response> {
  const cors = corsHeaders(request.headers.get('origin'));

  const limited = authRateLimitResponse(request, 'auth-register', 5, 15 * 60 * 1000, cors);
  if (limited) return limited;

  if (!env.HYPERDRIVE) {
    return json({ success: false, error: 'Edge auth not configured', code: 'EDGE_AUTH_UNAVAILABLE' }, 503, cors);
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      await withSql(env.HYPERDRIVE, (sql) =>
        recordAuthAudit(sql, {
          email: typeof email === 'string' ? email : null,
          eventType: 'auth.register.invalid-request',
        })
      );
      return json(
        { error: 'Email and password are required', code: 'MISSING_FIELDS', success: false },
        400,
        cors
      );
    }

    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      await withSql(env.HYPERDRIVE, (sql) =>
        recordAuthAudit(sql, { email: trimmed, eventType: 'auth.register.invalid-email' })
      );
      return json(
        { error: 'Please provide a valid email address', code: 'INVALID_EMAIL', success: false },
        400,
        cors
      );
    }

    if (password.length < 8) {
      await withSql(env.HYPERDRIVE, (sql) =>
        recordAuthAudit(sql, { email: trimmed, eventType: 'auth.register.weak-password' })
      );
      return json(
        { error: 'Password must be at least 8 characters', code: 'INVALID_PASSWORD', success: false },
        400,
        cors
      );
    }

    const existing = await withSql(env.HYPERDRIVE, (sql) => findUserByEmail(sql, trimmed));
    if (existing) {
      await withSql(env.HYPERDRIVE, (sql) =>
        recordAuthAudit(sql, {
          userId: existing.id,
          email: existing.email,
          eventType: 'auth.register.duplicate-email',
        })
      );
      return json(
        { success: false, code: 'EMAIL_IN_USE', error: REGISTER_DUPLICATE_MESSAGE },
        409,
        cors
      );
    }

    const passwordHash = await hashPassword(password);
    const stored = await withSql(env.HYPERDRIVE, (sql) => createUser(sql, trimmed, passwordHash, 'client'));

    try {
      await withSql(env.HYPERDRIVE, (sql) => pruneAuthTokens(sql));
      const delivery = await sendVerificationEmail(env, request, stored, async () => {
        const rawToken = createOpaqueToken();
        const now = Date.now();
        const record: StoredAuthToken = {
          id: `authtok-${now}-${Math.random().toString(36).slice(2, 9)}`,
          userId: stored.id,
          email: stored.email,
          type: 'email-verify',
          tokenHash: await sha256Hex(rawToken),
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + VERIFY_TTL_MS).toISOString(),
          consumedAt: null,
        };
        await withSql(env.HYPERDRIVE!, (sql) => replaceActiveAuthToken(sql, stored.id, 'email-verify', record));
        return rawToken;
      });

      await withSql(env.HYPERDRIVE, (sql) =>
        recordAuthAudit(sql, {
          userId: stored.id,
          email: stored.email,
          eventType: 'auth.register.created',
          eventMeta: { deliveryMode: delivery.deliveryMode, edge: true },
        })
      );

      return json(
        {
          message: 'Account created. Check your email to verify your account before signing in.',
          deliveryMode: delivery.deliveryMode,
          success: true,
          edge: true,
        },
        200,
        cors
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email delivery failed';
      await withSql(env.HYPERDRIVE, (sql) =>
        recordAuthAudit(sql, {
          userId: stored.id,
          email: stored.email,
          eventType: 'auth.register.email-delivery-failed',
          eventMeta: { message },
        })
      );
      return json(
        {
          success: false,
          code: 'VERIFICATION_EMAIL_FAILED',
          accountCreated: true,
          message:
            'Account created, but we could not send the verification email right now. Use "Resend verification email" in the sign-in panel after email delivery is configured.',
          error: message,
        },
        503,
        cors
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    await withSql(env.HYPERDRIVE, (sql) =>
      recordAuthAudit(sql, { eventType: 'auth.register.error', eventMeta: { message } })
    ).catch(() => undefined);
    return json(
      {
        error:
          message === 'AUTH_EMAIL_NOT_CONFIGURED'
            ? 'Account email delivery is not configured. Please contact support before enabling registration.'
            : message,
        code: 'INTERNAL_ERROR',
        success: false,
      },
      500,
      cors
    );
  }
}
