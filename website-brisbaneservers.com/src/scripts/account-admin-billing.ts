/**
 * Admin Billing panel: subscribers, usage-by-user, PayID grants.
 */
import { workspaceFetch } from '../lib/client-api';
import { getPortalAccountContext } from './account-workspace-runtime';
import type { PortalAccountContext } from './portal-account-extensions';
import { showConfirmDialog } from './portal-confirm-dialog';
import { trackPortalAction, trackPortalError } from './portal-markov-tracker';

type BillingAccountRow = {
  userId: string;
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  dailyBonusUnits: number;
  updatedAt: string;
};

type UsageUserRow = {
  userId: string;
  email: string;
  role: string;
  baseCap: number;
  bonus: number;
  subscriptionBonus: number;
  cap: number;
  used: number;
  remaining: number;
  nearCap: boolean;
  atCap: boolean;
  subscriptionStatus: string;
  subscriptionActive: boolean;
};

let accountsCache: BillingAccountRow[] = [];
let usageCache: UsageUserRow[] = [];
let panelBound = false;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function truncateId(id: string | null): string {
  if (!id) return '—';
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function hasSession(ctx: PortalAccountContext): boolean {
  return ctx.hasWorkspaceSession?.() ?? Boolean(ctx.getAuthToken());
}

function filterRows<T extends { email: string; status?: string; subscriptionStatus?: string }>(
  rows: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const haystack = `${row.email} ${row.status ?? ''} ${row.subscriptionStatus ?? ''}`.toLowerCase();
    return haystack.includes(q);
  });
}

function renderStripeStatus(data: {
  stripeConfigured?: boolean;
  activeCount?: number;
  subscriptionDailyBonus?: number;
}): void {
  const el = document.getElementById('admin-billing-stripe-status');
  if (!el) return;
  if (!data.stripeConfigured) {
    el.innerHTML =
      '<strong>Stripe not configured.</strong> Set <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_AI_BOOST_PRICE_ID</code>, and <code>STRIPE_WEBHOOK_SECRET</code> on the edge worker.';
    return;
  }
  el.innerHTML = `<strong>Stripe live.</strong> ${data.activeCount ?? 0} active subscriber(s). AI Boost adds +${data.subscriptionDailyBonus ?? 15} daily units while active. Webhook: <code>POST /api/billing/webhook</code>`;
}

function renderSubscribersTable(query = ''): void {
  const tbody = document.getElementById('admin-billing-subscribers-tbody');
  if (!tbody) return;

  const rows = filterRows(accountsCache, query);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5">No billing accounts match this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.email)}</td>
        <td><span class="admin-billing-badge admin-billing-badge--${escapeHtml(row.status)}">${escapeHtml(row.status)}</span></td>
        <td>${row.dailyBonusUnits > 0 ? `+${row.dailyBonusUnits}` : '—'}</td>
        <td><code>${escapeHtml(truncateId(row.stripeCustomerId))}</code></td>
        <td>${escapeHtml(formatDate(row.updatedAt))}</td>
      </tr>`
    )
    .join('');
}

function renderUsageTable(query = ''): void {
  const tbody = document.getElementById('admin-billing-usage-tbody');
  if (!tbody) return;

  const rows = filterRows(usageCache, query);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6">No usage rows match this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      const bonusParts: string[] = [];
      if (row.bonus > 0) bonusParts.push(`${row.bonus} token`);
      if (row.subscriptionBonus > 0) bonusParts.push(`${row.subscriptionBonus} sub`);
      const bonusLabel = bonusParts.length ? bonusParts.join(' + ') : `base ${row.baseCap}`;
      const capClass = row.atCap ? 'admin-billing-cap--critical' : row.nearCap ? 'admin-billing-cap--warning' : '';
      const subLabel = row.subscriptionActive
        ? `<span class="admin-billing-badge admin-billing-badge--active">${escapeHtml(row.subscriptionStatus)}</span>`
        : '—';
      return `<tr data-user-email="${escapeHtml(row.email)}">
        <td>${escapeHtml(row.email)}</td>
        <td class="${capClass}">${row.used} / ${row.cap}</td>
        <td>${row.remaining}</td>
        <td>${escapeHtml(bonusLabel)}</td>
        <td>${subLabel}</td>
        <td><button type="button" class="btn btn-secondary btn-sm" data-grant-email="${escapeHtml(row.email)}">Grant</button></td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll<HTMLButtonElement>('[data-grant-email]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-grant-email');
      const emailInput = document.getElementById('admin-billing-grant-email') as HTMLInputElement | null;
      if (email && emailInput) {
        emailInput.value = email;
        emailInput.focus();
        document.getElementById('admin-billing-grant-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
}

function renderSummary(totals?: {
  totalUsed: number;
  usersWithUsage: number;
  usersNearCap: number;
  usersAtCap: number;
  activeUsers: number;
}): void {
  const summary = document.getElementById('admin-billing-summary');
  if (!summary || !totals) return;
  summary.textContent = `${totals.totalUsed} units used today across ${totals.usersWithUsage} user(s) · ${totals.usersNearCap} near cap · ${totals.usersAtCap} at cap · ${totals.activeUsers} active accounts`;
}

async function submitBillingGrant(ctx: PortalAccountContext, event: Event): Promise<void> {
  event.preventDefault();
  const email = (document.getElementById('admin-billing-grant-email') as HTMLInputElement | null)?.value.trim();
  const units = Number((document.getElementById('admin-billing-grant-units') as HTMLInputElement | null)?.value);
  const note = (document.getElementById('admin-billing-grant-note') as HTMLInputElement | null)?.value.trim();
  const statusEl = document.getElementById('admin-billing-grant-status');
  if (!email || !Number.isFinite(units)) return;

  const ok = await showConfirmDialog({
    title: 'Grant AI usage units',
    message: `Grant ${units} bonus AI unit(s) to ${email} for today (UTC)?`,
    confirmLabel: 'Grant',
    variant: 'primary',
  });
  if (!ok) return;

  trackPortalAction('grantAiUsageUnits');
  if (statusEl) statusEl.textContent = 'Granting…';
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/usage/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, units, note: note || undefined }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      trackPortalError('grantAiUsageUnits', new Error(data.error || 'Grant failed'));
      if (statusEl) statusEl.textContent = data.error || 'Grant failed.';
      return;
    }
    if (statusEl) statusEl.textContent = `Granted ${data.unitsGranted} unit(s) to ${data.email}.`;
    (document.getElementById('admin-billing-grant-form') as HTMLFormElement | null)?.reset();
    const unitsInput = document.getElementById('admin-billing-grant-units') as HTMLInputElement | null;
    if (unitsInput) unitsInput.value = '5';
    await loadAdminBillingPanel(ctx);
  } catch (error) {
    trackPortalError('grantAiUsageUnits', error);
    if (statusEl) statusEl.textContent = 'Network error.';
  }
}

export async function loadAdminBillingPanel(ctx?: PortalAccountContext): Promise<void> {
  trackPortalAction('loadAdminBillingPanel');
  const accountCtx = ctx ?? (getPortalAccountContext() as unknown as PortalAccountContext);
  const summaryEl = document.getElementById('admin-billing-summary');
  const subscribersBody = document.getElementById('admin-billing-subscribers-tbody');
  const usageBody = document.getElementById('admin-billing-usage-tbody');

  if (!hasSession(accountCtx)) {
    if (summaryEl) summaryEl.textContent = 'Sign in as admin to view billing.';
    if (subscribersBody) subscribersBody.innerHTML = '<tr><td colspan="5">Sign in required.</td></tr>';
    if (usageBody) usageBody.innerHTML = '<tr><td colspan="6">Sign in required.</td></tr>';
    return;
  }

  const searchQuery =
    (document.getElementById('admin-billing-search') as HTMLInputElement | null)?.value ?? '';

  if (summaryEl) summaryEl.textContent = 'Loading billing data…';
  if (subscribersBody) subscribersBody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
  if (usageBody) usageBody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';

  try {
    const [accountsRes, usageRes] = await Promise.all([
      workspaceFetch(`${accountCtx.apiBaseUrl}/admin/billing/accounts`),
      workspaceFetch(`${accountCtx.apiBaseUrl}/admin/usage/summary`),
    ]);
    const accountsData = await accountsRes.json();
    const usageData = await usageRes.json();

    if (!accountsRes.ok || !accountsData.success) {
      if (summaryEl) summaryEl.textContent = accountsData.error || 'Could not load billing accounts.';
      return;
    }

    accountsCache = Array.isArray(accountsData.accounts) ? accountsData.accounts : [];
    renderStripeStatus(accountsData);

    if (!usageRes.ok || !usageData.success) {
      if (summaryEl) summaryEl.textContent = usageData.error || 'Could not load usage summary.';
      renderSubscribersTable(searchQuery);
      return;
    }

    usageCache = Array.isArray(usageData.users) ? usageData.users : [];
    renderSummary(usageData.totals);
    renderSubscribersTable(searchQuery);
    renderUsageTable(searchQuery);
  } catch {
    if (summaryEl) summaryEl.textContent = 'Could not reach the API.';
    if (subscribersBody) subscribersBody.innerHTML = '<tr><td colspan="5">Network error.</td></tr>';
    if (usageBody) usageBody.innerHTML = '<tr><td colspan="6">Network error.</td></tr>';
  }
}

export function bindAdminBillingPanel(resolveCtx: () => PortalAccountContext): void {
  if (panelBound) return;
  panelBound = true;

  document.getElementById('admin-billing-refresh-btn')?.addEventListener('click', () => {
    void loadAdminBillingPanel(resolveCtx());
  });

  document.getElementById('admin-billing-search')?.addEventListener('input', () => {
    const query = (document.getElementById('admin-billing-search') as HTMLInputElement | null)?.value ?? '';
    renderSubscribersTable(query);
    renderUsageTable(query);
  });

  document.getElementById('admin-billing-grant-form')?.addEventListener('submit', (e) => {
    void submitBillingGrant(resolveCtx(), e);
  });
}
