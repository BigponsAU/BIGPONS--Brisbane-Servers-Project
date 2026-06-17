import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../utils/auth';
import { fulfillTokenRedemption } from '../../../../lib/token-redemption-queue';

/**
 * Mark a token perk fulfilment complete.
 * POST /api/admin/token-redemptions/fulfill  { "id": "...", "note": "optional" }
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { id?: string; note?: string };
  try {
    body = (await request.json()) as { id?: string; note?: string };
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON', code: 'INVALID_JSON', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return new Response(
      JSON.stringify({ error: 'id is required', code: 'ID_REQUIRED', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const item = await fulfillTokenRedemption(id, authResult.user.email ?? authResult.user.id, body.note);
    if (!item) {
      return new Response(
        JSON.stringify({ error: 'Queue item not found', code: 'NOT_FOUND', success: false }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify({ success: true, item }), {
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
