import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { listPendingTokenRedemptions } from '../../../lib/token-redemption-queue';

/**
 * Pending manual token perk fulfilments (spotlight, office hours).
 * GET /api/admin/token-redemptions
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
    const pending = await listPendingTokenRedemptions();
    return new Response(JSON.stringify({ success: true, pending }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
