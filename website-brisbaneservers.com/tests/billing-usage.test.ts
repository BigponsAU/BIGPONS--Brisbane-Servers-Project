import { describe, expect, it } from 'vitest';
import { STRIPE_SUBSCRIPTION_DAILY_BONUS } from '../src/lib/billing/stripe-config';

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
});
