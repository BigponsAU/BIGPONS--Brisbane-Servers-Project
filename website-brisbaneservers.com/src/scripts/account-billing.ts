/**
 * Client billing — Stripe checkout, Customer Portal, and Overview capacity wall.
 */
import { billingOffer, formatCapContrast } from '../data/billing-offer';
import { workspaceFetch } from '../lib/client-api';
import { showConfirmDialog } from './portal-confirm-dialog';
import { trackPortalAction, trackPortalError } from './portal-markov-tracker';
import type { PortalAccountContext } from './portal-account-extensions';

function hasSession(ctx: PortalAccountContext): boolean {
  return ctx.hasWorkspaceSession?.() ?? Boolean(ctx.getAuthToken());
}

function setBillingButtonVisibility(btn: HTMLButtonElement | null, visible: boolean): void {
  if (!btn) return;
  btn.hidden = !visible;
  btn.disabled = !visible;
  btn.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function setBusy(btn: HTMLButtonElement | null, busy: boolean, busyLabel?: string): void {
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.textContent || '';
    btn.disabled = true;
    if (busyLabel) btn.textContent = busyLabel;
  } else {
    btn.disabled = btn.hidden;
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
}

function showBanner(kind: 'success' | 'info' | 'warning', text: string): void {
  const banner = document.getElementById('client-ai-billing-banner');
  if (!banner) return;
  banner.hidden = !text;
  banner.textContent = text;
  banner.className = `portal-return-banner portal-return-banner--${kind}`;
}

export async function startStripeCheckout(ctx: PortalAccountContext): Promise<void> {
  const statusEl = document.getElementById('client-ai-billing-status');
  const upgradeBtn = document.getElementById('client-ai-upgrade-btn') as HTMLButtonElement | null;
  const confirmed = await showConfirmDialog({
    title: billingOffer.boost.confirmTitle,
    message: billingOffer.boost.confirmMessage,
    confirmLabel: billingOffer.boost.ctaSubscribe,
    variant: 'primary',
  });
  if (!confirmed) return;

  trackPortalAction('startBillingCheckout');
  setBusy(upgradeBtn, true, billingOffer.boost.ctaBusy);
  if (statusEl) statusEl.textContent = billingOffer.boost.ctaBusy;
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/billing/checkout`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success || !data.checkoutUrl) {
      const err = data.error || 'Checkout unavailable';
      trackPortalError('startBillingCheckout', new Error(err));
      if (statusEl) statusEl.textContent = err;
      setBusy(upgradeBtn, false);
      return;
    }
    window.location.href = data.checkoutUrl as string;
  } catch (error) {
    trackPortalError('startBillingCheckout', error);
    if (statusEl) statusEl.textContent = 'Could not reach billing service.';
    setBusy(upgradeBtn, false);
  }
}

export async function startBillingPortal(ctx: PortalAccountContext): Promise<void> {
  const statusEl = document.getElementById('client-ai-billing-status');
  const manageBtn = document.getElementById('client-ai-manage-btn') as HTMLButtonElement | null;
  trackPortalAction('startBillingPortal');
  setBusy(manageBtn, true, 'Opening Stripe…');
  if (statusEl) statusEl.textContent = 'Opening Stripe billing…';
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/billing/portal`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success || !data.portalUrl) {
      const err = data.error || 'Portal unavailable';
      trackPortalError('startBillingPortal', new Error(err));
      if (statusEl) statusEl.textContent = err;
      setBusy(manageBtn, false);
      return;
    }
    window.location.href = data.portalUrl as string;
  } catch (error) {
    trackPortalError('startBillingPortal', error);
    if (statusEl) statusEl.textContent = 'Could not reach billing service.';
    setBusy(manageBtn, false);
  }
}

const USAGE_FETCH_TIMEOUT_MS = 12000;

function renderMeter(used: number, cap: number, remaining: number): void {
  const wrap = document.getElementById('client-ai-usage-bar-wrap');
  const fill = document.getElementById('client-ai-usage-bar-fill');
  if (!wrap || !fill || cap <= 0) {
    wrap?.setAttribute('hidden', '');
    return;
  }
  wrap.removeAttribute('hidden');
  const pct = Math.max(0, Math.min(100, Math.round((used / cap) * 100)));
  fill.style.width = `${pct}%`;
  const level = remaining === 0 ? 'critical' : remaining / cap <= 0.25 ? 'warning' : 'ok';
  wrap.setAttribute('data-level', level);
}

export async function loadOverviewAiBilling(ctx: PortalAccountContext): Promise<void> {
  const summaryEl = document.getElementById('client-ai-usage-summary');
  const metaEl = document.getElementById('client-ai-usage-meta');
  const upgradeBtn = document.getElementById('client-ai-upgrade-btn') as HTMLButtonElement | null;
  const manageBtn = document.getElementById('client-ai-manage-btn') as HTMLButtonElement | null;
  const card = document.getElementById('client-ai-usage-card');
  const priceEl = document.getElementById('offer-boost-price');
  if (!summaryEl || !card) return;

  if (!hasSession(ctx)) {
    summaryEl.textContent = 'Sign in to view daily AI capacity.';
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

  summaryEl.textContent = 'Loading daily AI capacity…';
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
    const displayPrice = typeof data.offer?.displayPrice === 'string' ? data.offer.displayPrice : '';
    if (priceEl) {
      priceEl.hidden = !displayPrice;
      priceEl.textContent = displayPrice;
    }

    summaryEl.textContent = `${used} of ${cap} AI units used today · ${remaining} remaining`;
    renderMeter(used, cap, remaining);

    if (metaEl) {
      const hints = [
        formatCapContrast(baseCap ?? Math.max(0, cap - (subscriptionBonus ?? 0) - (bonus ?? 0)), subActive),
        remaining === 0 ? billingOffer.atCap : remaining <= Math.max(1, Math.floor(cap * 0.25)) ? billingOffer.nearCap : '',
        (bonus ?? 0) > 0 ? `${bonus} token bonus today.` : '',
        subActive ? 'AI Boost is active.' : '',
      ].filter(Boolean);
      metaEl.textContent = hints.join(' ');
    }

    const stripeOn = Boolean(data.stripeConfigured);
    setBillingButtonVisibility(upgradeBtn, stripeOn && !subActive);
    setBillingButtonVisibility(manageBtn, stripeOn && subActive && hasCustomer);
    if (upgradeBtn && stripeOn && !subActive) {
      upgradeBtn.textContent = remaining === 0 ? 'Raise today’s cap with AI Boost' : billingOffer.boost.ctaSubscribe;
    }
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
  const hash = window.location.hash || '';
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${hash}`;
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
  if (billing === 'success' || billing === 'cancel' || billing === 'portal-return') {
    document.getElementById('capacity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (billing === 'success') {
    showBanner('success', billingOffer.success);
    if (statusEl) statusEl.textContent = billingOffer.success;
    clearBillingQueryParam();
    void loadOverviewAiBilling(resolveCtx());
  } else if (billing === 'cancel') {
    showBanner('info', billingOffer.cancel);
    if (statusEl) statusEl.textContent = billingOffer.cancel;
    clearBillingQueryParam();
  } else if (billing === 'portal-return') {
    showBanner('info', billingOffer.portalReturn);
    if (statusEl) statusEl.textContent = billingOffer.portalReturn;
    clearBillingQueryParam();
    void loadOverviewAiBilling(resolveCtx());
  }
}
