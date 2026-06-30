import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import {
  findBillingAccountByUserId,
  isActiveSubscriptionStatus,
} from '../../../lib/billing/billing-accounts';
import { isStripeConfigured, STRIPE_SUBSCRIPTION_DAILY_BONUS } from '../../../lib/billing/stripe-config';

/**
 * Billing / subscription status for current user.
 * GET /api/billing/status
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const account = await findBillingAccountByUserId(authResult.user.id);
  const active = account ? isActiveSubscriptionStatus(account.status) : false;

  return new Response(
    JSON.stringify({
      success: true,
      stripeConfigured: isStripeConfigured(),
      subscription: {
        status: account?.status ?? 'none',
        active,
        dailyBonusUnits: active
          ? account?.dailyBonusUnits ?? STRIPE_SUBSCRIPTION_DAILY_BONUS
          : 0,
        stripeCustomerId: account?.stripeCustomerId ?? null,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
