import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import { getUserUsageSummary } from '../../../lib/inference/usage-ledger';
import { getInferenceProvider, isWorkersAIConfigured } from '../../../lib/inference/workers-ai-client';

/**
 * Daily AI usage summary for portal meter.
 * GET /api/usage/me
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const summary = await getUserUsageSummary(authResult.user.id, authResult.user.role);
    return new Response(
      JSON.stringify({
        success: true,
        provider: getInferenceProvider(),
        workersAiConfigured: isWorkersAIConfigured(),
        daily: summary,
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
