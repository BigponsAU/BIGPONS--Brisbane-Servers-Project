/**
 * Client billing helpers — Stripe checkout, Customer Portal, and overview AI usage card.
 */
import { workspaceFetch } from '../lib/client-api';
import { trackPortalAction, trackPortalError } from './portal-markov-tracker';
import type { PortalAccountContext } from './portal-account-extensions';

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

export async function startBillingPortal(ctx: PortalAccountContext): Promise<void> {
  const statusEl = document.getElementById('client-ai-billing-status');
  trackPortalAction('startBillingPortal');
  if (statusEl) statusEl.textContent = 'Opening subscription portal…';
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/billing/portal`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success || !data.portalUrl) {
      const err = data.error || 'Portal unavailable';
      trackPortalError('startBillingPortal', new Error(err));
      if (statusEl) statusEl.textContent = err;
      return;
    }
    window.location.href = data.portalUrl as string;
  } catch (error) {
    trackPortalError('startBillingPortal', error);
    if (statusEl) statusEl.textContent = 'Could not reach billing service.';
  }
}

const USAGE_FETCH_TIMEOUT_MS = 12000;

function setBillingButtonVisibility(btn: HTMLButtonElement | null, visible: boolean): void {
  if (!btn) return;
  btn.hidden = !visible;
  btn.disabled = !visible;
  btn.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

export async function loadOverviewAiBilling(ctx: PortalAccountContext): Promise<void> {
  const summaryEl = document.getElementById('client-ai-usage-summary');
  const metaEl = document.getElementById('client-ai-usage-meta');
  const upgradeBtn = document.getElementById('client-ai-upgrade-btn') as HTMLButtonElement | null;
  const manageBtn = document.getElementById('client-ai-manage-btn') as HTMLButtonElement | null;
  const card = document.getElementById('client-ai-usage-card');
  if (!summaryEl || !card) return;

  if (!hasSession(ctx)) {
    summaryEl.textContent = 'Sign in to view daily AI usage.';
    if (metaEl) metaEl.textContent = '';
    setBillingButtonVisibility(upgradeBtn, false);
    setBillingButtonVisibility(manageBtn, false);
    return;
  }

  const apiBase = (ctx.apiBaseUrl || '').replace(/\/+$/, '');
  if (!apiBase) {
    summaryEl.textContent = 'Account API is not configured.';
    setBillingButtonVisibility(upgradeBtn, false);
    setBillingButtonVisibility(manageBtn, false);
    return;
  }

  summaryEl.textContent = 'Loading daily AI usage…';
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), USAGE_FETCH_TIMEOUT_MS);
  try {
    const res = await workspaceFetch(`${apiBase}/usage/me`, { signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.daily) {
      summaryEl.textContent = data.error || 'Could not load usage.';
      setBillingButtonVisibility(upgradeBtn, false);
      setBillingButtonVisibility(manageBtn, false);
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
    const hasCustomer = Boolean(data.subscription?.stripeCustomerId);
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
        subActive && hasCustomer ? 'Manage invoices and cancellation via the button below.' : '',
      ].filter(Boolean);
      metaEl.textContent = hints.join(' ');
    }

    setBillingButtonVisibility(upgradeBtn, Boolean(data.stripeConfigured) && !subActive);
    setBillingButtonVisibility(manageBtn, Boolean(data.stripeConfigured) && subActive && hasCustomer);
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    summaryEl.textContent = timedOut
      ? 'Usage API timed out — try refreshing Overview.'
      : 'Could not reach usage API.';
    setBillingButtonVisibility(upgradeBtn, false);
    setBillingButtonVisibility(manageBtn, false);
  } finally {
    window.clearTimeout(timeout);
  }
}

function clearBillingQueryParam(): void {
  const params = new URLSearchParams(window.location.search);
  params.delete('billing');
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
  window.history.replaceState({}, '', next);
}

export function bindOverviewBilling(resolveCtx: () => PortalAccountContext): void {
  document.getElementById('client-ai-upgrade-btn')?.addEventListener('click', () => {
    void startStripeCheckout(resolveCtx());
  });

  document.getElementById('client-ai-manage-btn')?.addEventListener('click', () => {
    void startBillingPortal(resolveCtx());
  });

  const params = new URLSearchParams(window.location.search);
  const billing = params.get('billing');
  const statusEl = document.getElementById('client-ai-billing-status');
  if (billing === 'success' && statusEl) {
    statusEl.textContent = 'Subscription checkout complete — refresh if cap has not updated yet.';
    clearBillingQueryParam();
    void loadOverviewAiBilling(resolveCtx());
  } else if (billing === 'cancel' && statusEl) {
    statusEl.textContent = 'Checkout canceled.';
    clearBillingQueryParam();
  } else if (billing === 'portal-return' && statusEl) {
    statusEl.textContent = 'Returned from subscription portal.';
    clearBillingQueryParam();
    void loadOverviewAiBilling(resolveCtx());
  }
}
