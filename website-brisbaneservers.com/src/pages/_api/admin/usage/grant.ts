import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../utils/auth';
import { findUserByEmail } from '../../../../lib/db/users';
import { grantDailyAiBonus } from '../../../../lib/inference/usage-ledger';

/**
 * Admin grant of daily AI bonus units (PayID / manual top-up).
 * POST /api/admin/usage/grant  { email, units, note? }
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { email?: string; units?: number; note?: string };
  try {
    body = (await request.json()) as { email?: string; units?: number; note?: string };
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON', code: 'INVALID_JSON', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const units = typeof body.units === 'number' ? Math.floor(body.units) : 0;
  if (!email || units < 1 || units > 50) {
    return new Response(
      JSON.stringify({
        error: 'email and units (1–50) are required',
        code: 'INVALID_INPUT',
        success: false,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'User not found', code: 'USER_NOT_FOUND', success: false }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const granted = await grantDailyAiBonus(user.id, units);
  return new Response(
    JSON.stringify({
      success: true,
      userId: user.id,
      email: user.email,
      unitsGranted: granted,
      grantedBy: authResult.user.email ?? authResult.user.id,
      note: typeof body.note === 'string' ? body.note.trim() : undefined,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
