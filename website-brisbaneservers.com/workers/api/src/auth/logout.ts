import { corsHeaders, json } from '../handlers';
import type { WorkerEnv } from '../env';
import { authTokenClearCookie } from '../lib/cookies';
import { deleteSession, recordAuthAudit, withSql } from '../lib/db';
import { getTokenFromRequest, requireAuth } from '../lib/auth-request';

export async function handleLogout(request: Request, env: WorkerEnv): Promise<Response> {
  const cors = corsHeaders(request.headers.get('origin'));

  if (!env.HYPERDRIVE) {
    return json({ success: false, error: 'Edge auth not configured', code: 'EDGE_AUTH_UNAVAILABLE' }, 503, cors);
  }

  const token = getTokenFromRequest(request);
  const authResult = await requireAuth(request, env.HYPERDRIVE);

  if ('error' in authResult) {
    await withSql(env.HYPERDRIVE, (sql) => recordAuthAudit(sql, { eventType: 'auth.logout.unauthorized' }));
    return json(
      { success: true, message: 'Signed out (session was already invalid)', edge: true },
      200,
      { ...cors, 'Set-Cookie': authTokenClearCookie(request) }
    );
  }

  await withSql(env.HYPERDRIVE, async (sql) => {
    if (token) await deleteSession(sql, token);
    await recordAuthAudit(sql, {
      userId: authResult.user.id,
      email: authResult.user.email,
      eventType: 'auth.logout.succeeded',
    });
  });

  return json(
    { success: true, message: 'Logged out successfully', edge: true },
    200,
    { ...cors, 'Set-Cookie': authTokenClearCookie(request) }
  );
}
