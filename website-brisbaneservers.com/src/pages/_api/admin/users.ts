import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { isUserEmailVerified, loadUsers } from '../../../lib/db/users';

/**
 * List all registered users. Admin only.
 * GET /api/admin/users
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
    const users = await loadUsers();
    const safe = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      emailVerified: isUserEmailVerified(u)
    }));
    return new Response(
      JSON.stringify({ users: safe, count: safe.length, success: true }),
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
