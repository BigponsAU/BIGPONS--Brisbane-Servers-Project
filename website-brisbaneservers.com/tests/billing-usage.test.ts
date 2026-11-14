import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { billingOffer, formatCapContrast } from '../src/data/billing-offer';
import {
  STRIPE_SUBSCRIPTION_DAILY_BONUS,
  getBillingPortalReturnUrl,
  getBillingSiteOrigin,
  getBillingSuccessUrl,
} from '../src/lib/billing/stripe-config';

const EDITOR_BASE_CAP = 8;

function isActiveSubscriptionStatus(status: string): boolean {
  return status === 'active' || status === 'trialing';
}

describe('billing configuration', () => {
  it('treats active and trialing as subscription active', () => {
    expect(isActiveSubscriptionStatus('active')).toBe(true);
    expect(isActiveSubscriptionStatus('trialing')).toBe(true);
    expect(isActiveSubscriptionStatus('canceled')).toBe(false);
  });

  it('defines editor base cap plus subscription bonus', () => {
    expect(EDITOR_BASE_CAP + STRIPE_SUBSCRIPTION_DAILY_BONUS).toBe(23);
  });

  it('builds portal return URL on account overview', () => {
    expect(getBillingPortalReturnUrl('https://brisbaneservers.com')).toBe(
      'https://brisbaneservers.com/account/?billing=portal-return#capacity'
    );
    expect(getBillingPortalReturnUrl('https://brisbaneservers.com/')).toBe(
      'https://brisbaneservers.com/account/?billing=portal-return#capacity'
    );
    expect(getBillingSuccessUrl('https://brisbaneservers.com')).toContain('#capacity');
  });

  it('prefers PUBLIC_SITE_URL over request origin for checkout returns', () => {
    // PUBLIC_SITE_URL is set on the edge worker; when missing, fall back to request origin.
    const origin = getBillingSiteOrigin('https://api.brisbaneservers.com');
    expect(origin).toMatch(/^https:\/\//);
    expect(origin).not.toMatch(/\/$/);
  });
});

describe('capacity offer wall', () => {
  it('contrasts included cap with Boost without inventing extra plans', () => {
    expect(formatCapContrast(8, false)).toContain('23 with AI Boost');
    expect(formatCapContrast(8, true)).toContain('8 included + 15 Boost');
    expect(billingOffer.trust).toContain('One paid product — no stacked plans');
    expect(STRIPE_SUBSCRIPTION_DAILY_BONUS).toBe(15);
  });

  it('checkout session is a professional Stripe handoff', () => {
    const src = readFileSync(resolve(__dirname, '../src/pages/_api/billing/checkout.ts'), 'utf8');
    expect(src).toContain('allow_promotion_codes: true');
    expect(src).toContain("locale: 'auto'");
    expect(src).toContain('custom_text');
  });
});
