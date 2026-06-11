import { corsHeaders, json } from '../handlers';
import type { WorkerEnv } from '../env';
import { createOpaqueToken, sha256Hex } from '../lib/auth-crypto';
import { sendVerificationEmail } from '../lib/auth-email';
import {
  findUserByEmail,
  isUserEmailVerified,
  pruneAuthTokens,
  recordAuthAudit,
  replaceActiveAuthToken,
  withSql,
} from '../lib/db';
import { isValidEmail } from '../lib/auth-request';
import { authRateLimitResponse } from '../lib/rate-limit';
import type { StoredAuthToken } from '../lib/types';

const GENERIC_SUCCESS = {
  success: true,
  message: 'If that account can be verified, a verification email has been sent.',
};

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export async function handleResendVerification(request: Request, env: WorkerEnv): Promise<Response> {
  const cors = corsHeaders(request.headers.get('origin'));

  const limited = authRateLimitResponse(request, 'auth-resend-verification', 5, 15 * 60 * 1000, cors);
  if (limited) return limited;

  if (!env.HYPERDRIVE) {
    return json({ success: false, error: 'Edge auth not configured', code: 'EDGE_AUTH_UNAVAILABLE' }, 503, cors);
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!isValidEmail(email)) {
      await withSql(env.HYPERDRIVE, (sql) =>
        recordAuthAudit(sql, { email, eventType: 'auth.resend-verification.invalid-email' })
      );
      return json(
        { error: 'Please provide a valid email address', code: 'INVALID_EMAIL', success: false },
        400,
        cors
      );
    }

    const user = await withSql(env.HYPERDRIVE, (sql) => findUserByEmail(sql, email));

    if (user && !isUserEmailVerified(user)) {
      try {
        await withSql(env.HYPERDRIVE, (sql) => pruneAuthTokens(sql));
        const delivery = await sendVerificationEmail(env, request, user, async () => {
          const rawToken = createOpaqueToken();
          const now = Date.now();
          const record: StoredAuthToken = {
            id: `authtok-${now}-${Math.random().toString(36).slice(2, 9)}`,
            userId: user.id,
            email: user.email,
            type: 'email-verify',
            tokenHash: await sha256Hex(rawToken),
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + VERIFY_TTL_MS).toISOString(),
            consumedAt: null,
          };
          await withSql(env.HYPERDRIVE!, (sql) => replaceActiveAuthToken(sql, user.id, 'email-verify', record));
          return rawToken;
        });

        await withSql(env.HYPERDRIVE, (sql) =>
          recordAuthAudit(sql, {
            userId: user.id,
            email: user.email,
            eventType: 'auth.resend-verification.sent',
            eventMeta: { deliveryMode: delivery.deliveryMode, edge: true },
          })
        );

        return json({ ...GENERIC_SUCCESS, edge: true, deliveryMode: delivery.deliveryMode }, 200, cors);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Email delivery failed';
        await withSql(env.HYPERDRIVE, (sql) =>
          recordAuthAudit(sql, {
            userId: user.id,
            email: user.email,
            eventType: 'auth.resend-verification.failed',
            eventMeta: { message },
          })
        );
        return json(
          {
            success: false,
            code: 'VERIFICATION_EMAIL_FAILED',
            error:
              'Could not send verification email right now. Please try again shortly or contact support if this persists.',
          },
          503,
          cors
        );
      }
    }

    await withSql(env.HYPERDRIVE, (sql) =>
      recordAuthAudit(sql, { email, eventType: 'auth.resend-verification.requested-ignored' })
    );
    return json({ ...GENERIC_SUCCESS, edge: true }, 200, cors);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await withSql(env.HYPERDRIVE, (sql) =>
      recordAuthAudit(sql, { eventType: 'auth.resend-verification.error', eventMeta: { message } })
    ).catch(() => undefined);
    return json(
      { success: false, code: 'INTERNAL_ERROR', error: 'Verification request failed. Please try again.' },
      500,
      cors
    );
  }
}
