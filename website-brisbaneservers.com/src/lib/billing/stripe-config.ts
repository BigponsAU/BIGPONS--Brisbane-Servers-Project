import { getRuntimeEnv } from '../../utils/runtime-env';

/** Extra daily AI units while Stripe subscription is active. */
export const STRIPE_SUBSCRIPTION_DAILY_BONUS = 15;

export function getStripeSecretKey(): string | undefined {
  return getRuntimeEnv('STRIPE_SECRET_KEY');
}

export function getStripeWebhookSecret(): string | undefined {
  return getRuntimeEnv('STRIPE_WEBHOOK_SECRET');
}

export function getStripeAiBoostPriceId(): string | undefined {
  return getRuntimeEnv('STRIPE_AI_BOOST_PRICE_ID');
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey() && getStripeAiBoostPriceId());
}

/** Prefer PUBLIC_SITE_URL so checkout returns to the site, not api.brisbaneservers.com. */
export function getBillingSiteOrigin(requestOrigin?: string): string {
  const configured = getRuntimeEnv('PUBLIC_SITE_URL');
  if (configured) return configured.replace(/\/+$/, '');
  if (requestOrigin) return requestOrigin.replace(/\/+$/, '');
  return 'https://brisbaneservers.com';
}

export function getBillingSuccessUrl(siteOrigin: string): string {
  const base = siteOrigin.replace(/\/+$/, '');
  return `${base}/account/?billing=success`;
}

export function getBillingCancelUrl(siteOrigin: string): string {
  const base = siteOrigin.replace(/\/+$/, '');
  return `${base}/account/?billing=cancel`;
}

export function getBillingPortalReturnUrl(siteOrigin: string): string {
  const base = siteOrigin.replace(/\/+$/, '');
  return `${base}/account/?billing=portal-return`;
}
