import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import { findBillingAccountByUserId } from '../../../lib/billing/billing-accounts';
import {
  getBillingPortalReturnUrl,
  getBillingSiteOrigin,
  isStripeConfigured,
} from '../../../lib/billing/stripe-config';
import { getStripeClient } from '../../../lib/billing/stripe-client';

/**
 * Create Stripe Customer Portal session for subscription self-service.
 * POST /api/billing/portal
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
  if (!stripe) {
    return new Response(
      JSON.stringify({ error: 'Stripe unavailable', code: 'STRIPE_UNAVAILABLE', success: false }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const account = await findBillingAccountByUserId(authResult.user.id);
  if (!account?.stripeCustomerId) {
    return new Response(
      JSON.stringify({
        error: 'No Stripe customer on file — subscribe first via checkout',
        code: 'NO_STRIPE_CUSTOMER',
        success: false,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const origin = getBillingSiteOrigin(url.origin);
    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: getBillingPortalReturnUrl(origin),
    });

    return new Response(
      JSON.stringify({ success: true, portalUrl: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'PORTAL_FAILED', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
