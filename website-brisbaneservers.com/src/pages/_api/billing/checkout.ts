import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import {
  findBillingAccountByUserId,
} from '../../../lib/billing/billing-accounts';
import {
  getStripeAiBoostPriceId,
  isStripeConfigured,
  STRIPE_SUBSCRIPTION_DAILY_BONUS,
  getBillingCancelUrl,
  getBillingSuccessUrl,
} from '../../../lib/billing/stripe-config';
import { getStripeClient } from '../../../lib/billing/stripe-client';
import { upsertBillingAccount } from '../../../lib/billing/billing-accounts';

/**
 * Create Stripe Checkout session for AI boost subscription.
 * POST /api/billing/checkout
 */
export const POST: APIRoute = async ({ request, url }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!isStripeConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Stripe billing is not configured on this environment',
        code: 'STRIPE_NOT_CONFIGURED',
        success: false,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const stripe = getStripeClient();
  const priceId = getStripeAiBoostPriceId();
  if (!stripe || !priceId) {
    return new Response(
      JSON.stringify({ error: 'Stripe unavailable', code: 'STRIPE_UNAVAILABLE', success: false }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const user = authResult.user;
    let account = await findBillingAccountByUserId(user.id);
    if (!account) {
      account = await upsertBillingAccount({
        userId: user.id,
        email: user.email,
        status: 'none',
      });
    }

    let customerId = account.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      account = await upsertBillingAccount({
        userId: user.id,
        email: user.email,
        stripeCustomerId: customerId,
        status: account.status,
      });
    }

    const origin = url.origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: getBillingSuccessUrl(origin),
      cancel_url: getBillingCancelUrl(origin),
      client_reference_id: user.id,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
        dailyBonusUnits: STRIPE_SUBSCRIPTION_DAILY_BONUS,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'CHECKOUT_FAILED', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
