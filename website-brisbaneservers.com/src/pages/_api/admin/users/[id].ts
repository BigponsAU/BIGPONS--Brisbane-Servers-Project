import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../utils/auth';
import {
  findUserById,
  isUserAccountRemoved,
  restoreUserAccount,
  softRemoveUserAccount,
} from '../../../../lib/db/users';
import { updateUserWorkspaceEnabledInDb } from '../../../../lib/db/auth-db';
import { hasWorkspaceAccess, roleRank } from '../../../../lib/workspace-access';
import { logAuthEvent } from '../../../../lib/auth-audit';

/**
 * Update a user's workspace access flag, soft-remove, or restore.
 * PATCH /api/admin/users/:id  { workspaceEnabled: boolean }
 * DELETE /api/admin/users/:id  { reason?: string } — soft-remove with backup
 * POST /api/admin/users/:id  { action: 'restore' }
 */
export const PATCH: APIRoute = async ({ request, params }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const userId = params.id?.trim();
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'User id is required', code: 'INVALID_REQUEST', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { workspaceEnabled?: unknown };
  try {
    body = (await request.json()) as { workspaceEnabled?: unknown };
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body', code: 'INVALID_REQUEST', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (typeof body.workspaceEnabled !== 'boolean') {
    return new Response(
      JSON.stringify({ error: 'workspaceEnabled must be a boolean', code: 'INVALID_REQUEST', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const existing = await findUserById(userId);
  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'User not found', code: 'NOT_FOUND', success: false }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (isUserAccountRemoved(existing)) {
    return new Response(
      JSON.stringify({ error: 'Restore this account before changing workspace access', code: 'USER_REMOVED', success: false }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Editors+ always have workspace via role; flipping the flag is cosmetic for them.
  if (hasWorkspaceAccess({ role: existing.role, workspaceEnabled: false }) && !body.workspaceEnabled) {
    return new Response(
      JSON.stringify({
        error: 'Editors and admins keep workspace access via role. Demote the role first if you need to revoke it.',
        code: 'ROLE_GRANTS_WORKSPACE',
        success: false,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    await updateUserWorkspaceEnabledInDb(userId, body.workspaceEnabled);
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: existing.id,
          email: existing.email,
          role: existing.role,
          workspaceEnabled: body.workspaceEnabled,
          workspaceAccess: hasWorkspaceAccess({ ...existing, workspaceEnabled: body.workspaceEnabled }),
          workspaceLockedByRole: hasWorkspaceAccess({ role: existing.role, workspaceEnabled: false }),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const userId = params.id?.trim();
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'User id is required', code: 'INVALID_REQUEST', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (userId === authResult.user.id) {
    return new Response(
      JSON.stringify({ error: 'You cannot remove your own account', code: 'CANNOT_REMOVE_SELF', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let reason: string | null = null;
  try {
    const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
    if (typeof body.reason === 'string' && body.reason.trim()) {
      reason = body.reason.trim().slice(0, 500);
    }
  } catch {
    /* optional body */
  }

  const existing = await findUserById(userId);
  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'User not found', code: 'NOT_FOUND', success: false }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (roleRank(existing.role) >= roleRank('admin') && roleRank(authResult.user.role) < roleRank('super-admin')) {
    return new Response(
      JSON.stringify({ error: 'Only a super-admin can remove admin accounts', code: 'FORBIDDEN', success: false }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const result = await softRemoveUserAccount(userId, authResult.user.email, reason);
    await logAuthEvent({
      userId,
      email: existing.email,
      eventType: 'auth.admin.user.removed',
      eventMeta: { removedBy: authResult.user.email, backupId: result.backupId, reason },
    });
    return new Response(
      JSON.stringify({
        success: true,
        backupId: result.backupId,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          removedAt: result.user.removedAt,
          removedBy: result.user.removedBy,
          removalReason: result.user.removalReason,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    const code =
      message === 'USER_ALREADY_REMOVED' ? 'USER_ALREADY_REMOVED' : message === 'USER_NOT_FOUND' ? 'NOT_FOUND' : 'INTERNAL_ERROR';
    return new Response(
      JSON.stringify({ error: message, code, success: false }),
      { status: code === 'NOT_FOUND' ? 404 : code === 'USER_ALREADY_REMOVED' ? 409 : 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

export const POST: APIRoute = async ({ request, params }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const userId = params.id?.trim();
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'User id is required', code: 'INVALID_REQUEST', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { action?: unknown };
  try {
    body = (await request.json()) as { action?: unknown };
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body', code: 'INVALID_REQUEST', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (body.action !== 'restore') {
    return new Response(
      JSON.stringify({ error: 'Unsupported action', code: 'INVALID_REQUEST', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const restored = await restoreUserAccount(userId);
    await logAuthEvent({
      userId,
      email: restored.email,
      eventType: 'auth.admin.user.restored',
      eventMeta: { restoredBy: authResult.user.email },
    });
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: restored.id,
          email: restored.email,
          role: restored.role,
          removedAt: null,
          workspaceEnabled: Boolean(restored.workspaceEnabled),
          workspaceAccess: hasWorkspaceAccess(restored),
          workspaceLockedByRole: hasWorkspaceAccess({ role: restored.role, workspaceEnabled: false }),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    const code =
      message === 'USER_NOT_REMOVED' ? 'USER_NOT_REMOVED' : message === 'USER_NOT_FOUND' ? 'NOT_FOUND' : 'INTERNAL_ERROR';
    return new Response(
      JSON.stringify({ error: message, code, success: false }),
      { status: code === 'NOT_FOUND' ? 404 : code === 'USER_NOT_REMOVED' ? 409 : 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
