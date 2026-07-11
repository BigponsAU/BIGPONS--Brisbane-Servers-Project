import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { isUserEmailVerified, loadUsers } from '../../../lib/db/users';
import { hasWorkspaceAccess } from '../../../lib/workspace-access';

/**
 * List registered users. Admin only.
 * GET /api/admin/users?includeRemoved=1
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  try {
    const includeRemoved = new URL(request.url).searchParams.get('includeRemoved') === '1';
    const users = await loadUsers({ includeRemoved: true });
    const safe = users
      .filter((u) => includeRemoved || !u.removedAt)
      .map((u) => {
        const workspaceEnabled = Boolean(u.workspaceEnabled);
        const workspaceAccess = hasWorkspaceAccess(u);
        const workspaceLockedByRole = hasWorkspaceAccess({ role: u.role, workspaceEnabled: false });
        return {
          id: u.id,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          emailVerified: isUserEmailVerified(u),
          workspaceEnabled,
          workspaceAccess,
          workspaceLockedByRole,
          removedAt: u.removedAt ?? null,
          removedBy: u.removedBy ?? null,
          removalReason: u.removalReason ?? null,
        };
      });
    return new Response(
      JSON.stringify({
        users: safe,
        count: safe.length,
        activeCount: safe.filter((u) => !u.removedAt).length,
        removedCount: safe.filter((u) => u.removedAt).length,
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
