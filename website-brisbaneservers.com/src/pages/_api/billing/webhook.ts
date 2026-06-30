import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import {
  findBillingAccountByStripeCustomerId,
  upsertBillingAccount,
  type BillingSubscriptionStatus,
} from '../../../lib/billing/billing-accounts';
import { getStripeWebhookSecret, STRIPE_SUBSCRIPTION_DAILY_BONUS } from '../../../lib/billing/stripe-config';
import { getStripeClient } from '../../../lib/billing/stripe-client';
import { findUserById } from '../../../lib/db/users';

function mapStripeStatus(status: string | undefined): BillingSubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
      return status;
    default:
      return 'none';
  }
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId =
    subscription.metadata?.userId ||
    (typeof subscription.customer === 'string'
      ? (await findBillingAccountByStripeCustomerId(subscription.customer))?.userId
      : undefined);
  if (!userId) return;

  const user = await findUserById(userId);
  if (!user) return;

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;

  await upsertBillingAccount({
    userId,
    email: user.email,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: mapStripeStatus(subscription.status),
    dailyBonusUnits:
      subscription.status === 'active' || subscription.status === 'trialing'
        ? STRIPE_SUBSCRIPTION_DAILY_BONUS
        : 0,
  });
}

/**
 * Stripe webhook — subscription lifecycle for AI cap boost.
 * POST /api/billing/webhook
 */
export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();
  if (!stripe || !webhookSecret) {
    return new Response('Stripe webhook not configured', { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        if (userId && session.customer && typeof session.customer === 'string') {
          const user = await findUserById(userId);
          if (user) {
            await upsertBillingAccount({
              userId,
              email: user.email,
              stripeCustomerId: session.customer,
              stripeSubscriptionId:
                typeof session.subscription === 'string' ? session.subscription : null,
              status: 'active',
              dailyBonusUnits: STRIPE_SUBSCRIPTION_DAILY_BONUS,
            });
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Handler error';
    return new Response(message, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
