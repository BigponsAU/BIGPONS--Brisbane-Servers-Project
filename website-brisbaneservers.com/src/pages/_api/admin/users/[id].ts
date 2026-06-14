import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../utils/auth';
import { findUserById } from '../../../../lib/db/users';
import { updateUserWorkspaceEnabledInDb } from '../../../../lib/db/auth-db';

/**
 * Update a user's workspace access flag. Admin only.
 * PATCH /api/admin/users/:id  { workspaceEnabled: boolean }
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
