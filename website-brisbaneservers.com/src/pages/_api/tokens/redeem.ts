import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import { redeemTokenPerk } from '../../../lib/token-redemption';
import { getUserBalance } from '../../../lib/token-ledger';

/**
 * Redeem a flat token perk.
 * POST /api/tokens/redeem  { "perkId": "ai-boost" }
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { perkId?: string };
  try {
    body = (await request.json()) as { perkId?: string };
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON', code: 'INVALID_JSON', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const perkId = typeof body.perkId === 'string' ? body.perkId.trim() : '';
  if (!perkId) {
    return new Response(
      JSON.stringify({ error: 'perkId is required', code: 'PERK_REQUIRED', success: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await redeemTokenPerk(authResult.user.id, perkId, authResult.user.email);
    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: result.error, code: result.code, success: false }),
        { status: result.code === 'INSUFFICIENT_BALANCE' ? 402 : 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const balance = await getUserBalance(authResult.user.id);
    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
        balance,
        entry: result.entry,
        aiBonusGranted: result.aiBonusGranted,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
