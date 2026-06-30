import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import { getUserUsageSummary } from '../../../lib/inference/usage-ledger';
import { getInferenceProvider } from '../../../lib/inference/inference-provider';
import { isNvidiaConfigured, getNvidiaModelId } from '../../../lib/inference/nvidia-ai-client';
import { isWorkersAIConfigured } from '../../../lib/inference/workers-ai-client';
import { isStripeConfigured } from '../../../lib/billing/stripe-config';
import { findBillingAccountByUserId, isActiveSubscriptionStatus } from '../../../lib/billing/billing-accounts';

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
    const billingAccount = await findBillingAccountByUserId(authResult.user.id);
    const subscriptionActive = billingAccount
      ? isActiveSubscriptionStatus(billingAccount.status)
      : false;
    return new Response(
      JSON.stringify({
        success: true,
        provider: getInferenceProvider(),
        workersAiConfigured: isWorkersAIConfigured(),
        nvidiaConfigured: isNvidiaConfigured(),
        nvidiaModel: isNvidiaConfigured() ? getNvidiaModelId() : undefined,
        stripeConfigured: isStripeConfigured(),
        subscription: {
          active: subscriptionActive,
          status: billingAccount?.status ?? 'none',
          dailyBonusUnits: summary.subscriptionBonus,
        },
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
