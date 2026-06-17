/**
 * Admin Ops panel: daily AI usage meter and related ops UI.
 */
import { workspaceFetch } from '../lib/client-api';
import { getPortalAccountContext } from './account-workspace-runtime';
import type { PortalAccountContext } from './portal-account-extensions';

interface UsageMeResponse {
  success: boolean;
  error?: string;
  provider?: string;
  workersAiConfigured?: boolean;
  daily?: { cap: number; used: number; remaining: number; bonus?: number };
}

function hasSession(ctx: PortalAccountContext): boolean {
  return ctx.hasWorkspaceSession?.() ?? Boolean(ctx.getAuthToken());
}

function setUsageBarLevel(barWrap: HTMLElement, used: number, cap: number): void {
  if (cap <= 0) {
    barWrap.removeAttribute('data-level');
    return;
  }
  const ratio = used / cap;
  if (ratio >= 1) {
    barWrap.setAttribute('data-level', 'critical');
  } else if (ratio >= 0.8) {
    barWrap.setAttribute('data-level', 'warning');
  } else {
    barWrap.removeAttribute('data-level');
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function loadTokenRedemptionQueue(ctx?: PortalAccountContext): Promise<void> {
  const listEl = document.getElementById('admin-ops-token-queue');
  const statusEl = document.getElementById('admin-ops-token-queue-status');
  if (!listEl) return;

  const accountCtx = ctx ?? (getPortalAccountContext() as unknown as PortalAccountContext);
  if (!hasSession(accountCtx)) {
    listEl.innerHTML = '<p class="form-hint">Sign in as admin to view the queue.</p>';
    return;
  }

  listEl.innerHTML = '<p class="form-hint">Loading pending redemptions…</p>';
  try {
    const res = await workspaceFetch(`${accountCtx.apiBaseUrl}/admin/token-redemptions`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      listEl.innerHTML = `<p class="form-hint">${escapeHtml(data.error || 'Could not load queue.')}</p>`;
      return;
    }
    const pending = Array.isArray(data.pending) ? data.pending : [];
    if (!pending.length) {
      listEl.innerHTML = '<p class="form-hint">No pending spotlight or office-hours redemptions.</p>';
      return;
    }
    listEl.innerHTML = pending
      .map(
        (item: {
          id: string;
          perkLabel: string;
          userEmail?: string;
          userId: string;
          createdAt: string;
        }) => `
      <div class="admin-ops-queue-item" data-redemption-id="${escapeHtml(item.id)}">
        <div>
          <strong>${escapeHtml(item.perkLabel)}</strong>
          <p class="form-hint">${escapeHtml(item.userEmail || item.userId)} · ${escapeHtml(new Date(item.createdAt).toLocaleString())}</p>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-fulfill-redemption="${escapeHtml(item.id)}">Mark done</button>
      </div>`
      )
      .join('');

    listEl.querySelectorAll<HTMLButtonElement>('[data-fulfill-redemption]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-fulfill-redemption');
        if (!id) return;
        btn.disabled = true;
        if (statusEl) statusEl.textContent = 'Updating…';
        try {
          const fulfillRes = await workspaceFetch(`${accountCtx.apiBaseUrl}/admin/token-redemptions/fulfill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          const fulfillData = await fulfillRes.json();
          if (!fulfillRes.ok || !fulfillData.success) {
            if (statusEl) statusEl.textContent = fulfillData.error || 'Could not update.';
            btn.disabled = false;
            return;
          }
          if (statusEl) statusEl.textContent = 'Marked fulfilled.';
          await loadTokenRedemptionQueue(accountCtx);
        } catch {
          if (statusEl) statusEl.textContent = 'Network error.';
          btn.disabled = false;
        }
      });
    });
  } catch {
    listEl.innerHTML = '<p class="form-hint">Could not reach the API.</p>';
  }
}

export async function loadAdminOpsPanel(ctx?: PortalAccountContext): Promise<void> {
  const summaryEl = document.getElementById('admin-ops-usage-summary');
  const metaEl = document.getElementById('admin-ops-usage-meta');
  const barWrap = document.getElementById('admin-ops-usage-bar-wrap');
  const barFill = document.getElementById('admin-ops-usage-bar-fill');
  if (!summaryEl) return;

  const accountCtx = ctx ?? (getPortalAccountContext() as unknown as PortalAccountContext);

  if (!hasSession(accountCtx)) {
    summaryEl.textContent = 'Sign in to load usage meter.';
    if (metaEl) metaEl.textContent = '';
    if (barWrap) barWrap.hidden = true;
    return;
  }

  summaryEl.textContent = 'Loading daily AI usage…';
  if (metaEl) metaEl.textContent = '';
  if (barWrap) barWrap.hidden = true;

  try {
    const res = await workspaceFetch(`${accountCtx.apiBaseUrl}/usage/me`);
    const data = (await res.json()) as UsageMeResponse;

    if (!res.ok || !data.success || !data.daily) {
      summaryEl.textContent = data.error || 'Could not load usage.';
      return;
    }

    const { cap, used, remaining } = data.daily;
    const bonus = data.daily.bonus ?? 0;
    const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
    summaryEl.textContent =
      bonus > 0
        ? `${used} of ${cap} daily AI units used (${remaining} remaining, incl. ${bonus} token bonus)`
        : `${used} of ${cap} daily AI units used (${remaining} remaining)`;

    if (barWrap && barFill) {
      barWrap.hidden = false;
      barFill.style.width = `${pct}%`;
      setUsageBarLevel(barWrap, used, cap);
    }

    if (metaEl) {
      const provider = data.provider ?? 'template';
      const workersNote = data.workersAiConfigured
        ? 'Workers AI is configured.'
        : 'Workers AI not configured — using template engine.';
      metaEl.textContent = `Provider: ${provider}. ${workersNote} Resets at midnight UTC.`;
    }
  } catch {
    summaryEl.textContent = 'Could not reach the API to load usage.';
  }

  await loadTokenRedemptionQueue(accountCtx);
}

export function bindAdminOpsPanel(resolveCtx: () => PortalAccountContext): void {
  document.getElementById('refresh-admin-ops-usage')?.addEventListener('click', () => {
    void loadAdminOpsPanel(resolveCtx());
  });
  document.getElementById('refresh-admin-ops-token-queue')?.addEventListener('click', () => {
    void loadTokenRedemptionQueue(resolveCtx());
  });
}
