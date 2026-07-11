import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../utils/auth';
import {
  isActiveSubscriptionStatus,
  loadBillingAccounts,
} from '../../../../lib/billing/billing-accounts';
import { isStripeConfigured, STRIPE_SUBSCRIPTION_DAILY_BONUS } from '../../../../lib/billing/stripe-config';

/**
 * List billing accounts for admin subscriber roster.
 * GET /api/admin/billing/accounts
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
    const accounts = await loadBillingAccounts();
    const sorted = [...accounts].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const activeCount = sorted.filter((a) => isActiveSubscriptionStatus(a.status)).length;

    return new Response(
      JSON.stringify({
        success: true,
        stripeConfigured: isStripeConfigured(),
        subscriptionDailyBonus: STRIPE_SUBSCRIPTION_DAILY_BONUS,
        activeCount,
        count: sorted.length,
        accounts: sorted,
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
