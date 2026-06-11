import { corsHeaders, json } from '../handlers';
import type { WorkerEnv } from '../env';
import {
  consumeAuthToken,
  findUserById,
  markUserEmailVerified,
  recordAuthAudit,
  withSql,
} from '../lib/db';
import { authRateLimitResponse } from '../lib/rate-limit';

export async function handleVerifyEmail(request: Request, env: WorkerEnv): Promise<Response> {
  const cors = corsHeaders(request.headers.get('origin'));

  const limited = authRateLimitResponse(request, 'auth-verify-email', 15, 15 * 60 * 1000, cors);
  if (limited) return limited;

  if (!env.HYPERDRIVE) {
    return json({ success: false, error: 'Edge auth not configured', code: 'EDGE_AUTH_UNAVAILABLE' }, 503, cors);
  }

  const token = new URL(request.url).searchParams.get('token');
  if (!token) {
    await withSql(env.HYPERDRIVE, (sql) =>
      recordAuthAudit(sql, { eventType: 'auth.verify-email.missing-token' })
    );
    return json({ error: 'Verification token is required', code: 'MISSING_TOKEN', success: false }, 400, cors);
  }

  return withSql(env.HYPERDRIVE, async (sql) => {
    const record = await consumeAuthToken(sql, token, 'email-verify');
    if (!record) {
      await recordAuthAudit(sql, { eventType: 'auth.verify-email.invalid-token' });
      return json(
        { error: 'Verification link is invalid or expired', code: 'INVALID_TOKEN', success: false },
        400,
        cors
      );
    }

    const user = await findUserById(sql, record.userId);
    if (!user) {
      await recordAuthAudit(sql, {
        userId: record.userId,
        email: record.email,
        eventType: 'auth.verify-email.user-not-found',
      });
      return json({ error: 'User not found', code: 'USER_NOT_FOUND', success: false }, 404, cors);
    }

    await markUserEmailVerified(sql, user.id);
    await recordAuthAudit(sql, { userId: user.id, email: user.email, eventType: 'auth.verify-email.succeeded' });

    return json(
      {
        success: true,
        edge: true,
        email: user.email,
        message: 'Your email has been verified. You can now sign in with your email and password.',
      },
      200,
      cors
    );
  });
}
