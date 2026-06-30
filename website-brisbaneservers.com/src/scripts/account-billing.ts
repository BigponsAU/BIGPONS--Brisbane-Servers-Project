/**
 * Client billing helpers — Stripe checkout and overview AI usage card.
 */
import { workspaceFetch } from '../lib/client-api';
import { trackPortalAction, trackPortalError } from './portal-markov-tracker';
import type { PortalAccountContext } from './portal-account-extensions';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hasSession(ctx: PortalAccountContext): boolean {
  return ctx.hasWorkspaceSession?.() ?? Boolean(ctx.getAuthToken());
}

export async function startStripeCheckout(ctx: PortalAccountContext): Promise<void> {
  const statusEl = document.getElementById('client-ai-billing-status');
  trackPortalAction('startBillingCheckout');
  if (statusEl) statusEl.textContent = 'Opening Stripe checkout…';
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/billing/checkout`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success || !data.checkoutUrl) {
      const err = data.error || 'Checkout unavailable';
      trackPortalError('startBillingCheckout', new Error(err));
      if (statusEl) statusEl.textContent = err;
      return;
    }
    window.location.href = data.checkoutUrl as string;
  } catch (error) {
    trackPortalError('startBillingCheckout', error);
    if (statusEl) statusEl.textContent = 'Could not reach billing service.';
  }
}

export async function loadOverviewAiBilling(ctx: PortalAccountContext): Promise<void> {
  const summaryEl = document.getElementById('client-ai-usage-summary');
  const metaEl = document.getElementById('client-ai-usage-meta');
  const upgradeBtn = document.getElementById('client-ai-upgrade-btn') as HTMLButtonElement | null;
  const card = document.getElementById('client-ai-usage-card');
  if (!summaryEl || !card) return;

  if (!hasSession(ctx)) {
    summaryEl.textContent = 'Sign in to view daily AI usage.';
    if (metaEl) metaEl.textContent = '';
    if (upgradeBtn) upgradeBtn.hidden = true;
    return;
  }

  summaryEl.textContent = 'Loading daily AI usage…';
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/usage/me`);
    const data = await res.json();
    if (!res.ok || !data.success || !data.daily) {
      summaryEl.textContent = data.error || 'Could not load usage.';
      return;
    }

    const { cap, used, remaining, bonus, subscriptionBonus, baseCap } = data.daily as {
      cap: number;
      used: number;
      remaining: number;
      bonus?: number;
      subscriptionBonus?: number;
      baseCap?: number;
    };
    const subActive = Boolean(data.subscription?.active);
    const parts = [`${used} / ${cap} AI units used today`, `${remaining} remaining`];
    if ((bonus ?? 0) > 0) parts.push(`${bonus} token bonus`);
    if ((subscriptionBonus ?? 0) > 0) parts.push(`${subscriptionBonus} subscription boost`);
    summaryEl.textContent = parts.join(' · ');

    if (metaEl) {
      const hints = [
        `Role base cap: ${baseCap ?? cap}. Resets midnight UTC.`,
        subActive ? 'AI Boost subscription active.' : '',
        data.stripeConfigured && !subActive && remaining === 0
          ? 'Daily cap reached — upgrade for +15 units/day or redeem tokens.'
          : '',
      ].filter(Boolean);
      metaEl.textContent = hints.join(' ');
    }

    if (upgradeBtn) {
      const showUpgrade = Boolean(data.stripeConfigured) && !subActive;
      upgradeBtn.hidden = !showUpgrade;
      upgradeBtn.disabled = !showUpgrade;
      upgradeBtn.textContent = subActive ? 'Subscribed' : 'Upgrade AI cap (Stripe)';
    }
  } catch {
    summaryEl.textContent = 'Could not reach usage API.';
  }
}

export function bindOverviewBilling(ctx: PortalAccountContext): void {
  document.getElementById('client-ai-upgrade-btn')?.addEventListener('click', () => {
    void startStripeCheckout(ctx);
  });

  const params = new URLSearchParams(window.location.search);
  const billing = params.get('billing');
  const statusEl = document.getElementById('client-ai-billing-status');
  if (billing === 'success' && statusEl) {
    statusEl.textContent = 'Subscription checkout complete — refresh if cap has not updated yet.';
    params.delete('billing');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
    void loadOverviewAiBilling(ctx);
  } else if (billing === 'cancel' && statusEl) {
    statusEl.textContent = 'Checkout canceled.';
    params.delete('billing');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
  }
}

export function renderPayIdReference(ctx: PortalAccountContext, userId?: string): string {
  const id = userId || 'your-user-id';
  return `BS-${escapeHtml(id)}-TOPUP`;
}
