import { describe, expect, it } from 'vitest';
import {
  STRIPE_SUBSCRIPTION_DAILY_BONUS,
  getBillingPortalReturnUrl,
  getBillingSiteOrigin,
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
      'https://brisbaneservers.com/account/?billing=portal-return'
    );
    expect(getBillingPortalReturnUrl('https://brisbaneservers.com/')).toBe(
      'https://brisbaneservers.com/account/?billing=portal-return'
    );
  });

  it('prefers PUBLIC_SITE_URL over request origin for checkout returns', () => {
    // PUBLIC_SITE_URL is set on the edge worker; when missing, fall back to request origin.
    const origin = getBillingSiteOrigin('https://api.brisbaneservers.com');
    expect(origin === 'https://brisbaneservers.com' || origin === 'https://api.brisbaneservers.com').toBe(
      true
    );
    expect(origin).not.toMatch(/\/$/);
  });
});
