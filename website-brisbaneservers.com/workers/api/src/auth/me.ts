import { corsHeaders, json } from '../handlers';
import type { WorkerEnv } from '../env';
import { findUserById, isUserEmailVerified, withSql } from '../lib/db';
import { requireAuth } from '../lib/auth-request';

export async function handleMe(request: Request, env: WorkerEnv): Promise<Response> {
  const cors = corsHeaders(request.headers.get('origin'));

  if (!env.HYPERDRIVE) {
    return json({ success: false, error: 'Edge auth not configured', code: 'EDGE_AUTH_UNAVAILABLE' }, 503, cors);
  }

  const authResult = await requireAuth(request, env.HYPERDRIVE);
  if ('error' in authResult) {
    return json({ error: authResult.error, code: authResult.code, success: false }, 401, cors);
  }

  const stored = await withSql(env.HYPERDRIVE, (sql) => findUserById(sql, authResult.user.id)).catch(() => null);
  const user = stored
    ? {
        ...authResult.user,
        emailVerified: isUserEmailVerified(stored),
        workspaceEnabled: Boolean(stored.workspaceEnabled),
      }
    : authResult.user;

  return json({ user, success: true, edge: true }, 200, cors);
}
