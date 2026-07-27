/**
 * Admin Ops panel: site usage snapshot, search corpus, token queue, inference provider notes.
 */
import { workspaceFetch } from '../lib/client-api';
import { getPortalAccountContext } from './account-workspace-runtime';
import type { PortalAccountContext } from './portal-account-extensions';
import { showConfirmDialog } from './portal-confirm-dialog';
import { trackPortalAction } from './portal-markov-tracker';
import { escapeHtml, workspaceErrorMessage } from './account-workspace-utils';

interface UsageSummaryResponse {
  success: boolean;
  error?: string;
  day?: string;
  provider?: string;
  nvidiaConfigured?: boolean;
  nvidiaModel?: string;
  workersAiConfigured?: boolean;
  totals?: {
    totalUsed: number;
    usersWithUsage: number;
    usersNearCap: number;
    usersAtCap: number;
    activeUsers: number;
  };
}

function hasSession(ctx: PortalAccountContext): boolean {
  return ctx.hasWorkspaceSession?.() ?? Boolean(ctx.getAuthToken());
}

function setUsageBarLevel(barWrap: HTMLElement, ratio: number): void {
  if (ratio >= 1) {
    barWrap.setAttribute('data-level', 'critical');
  } else if (ratio >= 0.5) {
    barWrap.setAttribute('data-level', 'warning');
  } else {
    barWrap.removeAttribute('data-level');
  }
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
        const ok = await showConfirmDialog({
          title: 'Mark redemption fulfilled',
          message: 'Mark this token redemption as manually completed?',
          confirmLabel: 'Mark done',
          variant: 'primary',
        });
        if (!ok) return;
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
        } catch (error) {
          if (statusEl) statusEl.textContent = workspaceErrorMessage(error, 'Network error.');
          btn.disabled = false;
        }
      });
    });
  } catch (error) {
    listEl.innerHTML = `<p class="form-hint">${escapeHtml(workspaceErrorMessage(error, 'Could not reach the API.'))}</p>`;
  }
}

async function loadSiteUsageSnapshot(ctx: PortalAccountContext): Promise<void> {
  const summaryEl = document.getElementById('admin-ops-usage-summary');
  const metaEl = document.getElementById('admin-ops-usage-meta');
  const barWrap = document.getElementById('admin-ops-usage-bar-wrap');
  const barFill = document.getElementById('admin-ops-usage-bar-fill');
  if (!summaryEl) return;

  if (!hasSession(ctx)) {
    summaryEl.textContent = 'Sign in to load site usage.';
    if (metaEl) metaEl.textContent = '';
    if (barWrap) barWrap.hidden = true;
    return;
  }

  summaryEl.textContent = 'Loading site usage snapshot…';
  if (metaEl) metaEl.textContent = '';
  if (barWrap) barWrap.hidden = true;

  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/usage/summary`);
    const data = (await res.json()) as UsageSummaryResponse;

    if (!res.ok || !data.success || !data.totals) {
      summaryEl.textContent = data.error || 'Could not load site usage.';
      return;
    }

    const { totalUsed, usersWithUsage, usersNearCap, usersAtCap, activeUsers } = data.totals;
    summaryEl.textContent = `${totalUsed} AI units used today · ${usersWithUsage} user(s) active · ${usersNearCap} near cap · ${usersAtCap} at cap`;

    const maxBarUnits = Math.max(totalUsed, usersAtCap * 10, 1);
    const pct = Math.min(100, Math.round((totalUsed / maxBarUnits) * 100));
    if (barWrap && barFill) {
      barWrap.hidden = false;
      barFill.style.width = `${pct}%`;
      setUsageBarLevel(barWrap, usersAtCap > 0 ? 1 : usersNearCap > 0 ? 0.8 : totalUsed / maxBarUnits);
    }

    if (metaEl) {
      const parts: string[] = [`Day: ${data.day ?? 'today'} (UTC).`, `${activeUsers} registered accounts.`];
      const provider = data.provider ?? 'template';
      parts.push(`Active provider: ${provider}.`);
      if (data.nvidiaConfigured) {
        parts.push(`NVIDIA NIM${data.nvidiaModel ? ` (${data.nvidiaModel})` : ''} configured.`);
      }
      if (data.workersAiConfigured) {
        parts.push('Workers AI fallback available.');
      }
      if (!data.nvidiaConfigured && !data.workersAiConfigured) {
        parts.push('No external LLM — template engine only.');
      }
      parts.push('Per-user caps and grants live in Billing.');
      metaEl.textContent = parts.join(' ');
    }

    const providerStatus = document.getElementById('admin-ops-provider-status');
    if (providerStatus) {
      const bits: string[] = [];
      bits.push(`Active: ${data.provider ?? 'template'}.`);
      if (data.nvidiaConfigured) {
        bits.push(`NVIDIA NIM${data.nvidiaModel ? ` · ${data.nvidiaModel}` : ''} ready.`);
      } else {
        bits.push('NVIDIA NIM not configured.');
      }
      bits.push(
        data.workersAiConfigured
          ? 'Workers AI fallback ready.'
          : 'Workers AI fallback not available.'
      );
      providerStatus.textContent = bits.join(' ');
    }
  } catch {
    summaryEl.textContent = 'Could not reach the API to load site usage.';
  }
}

interface SearchCorpusResponse {
  success: boolean;
  error?: string;
  semanticIndex?: { chunkCount: number; resourceIds: number; embeddingModels?: Record<string, number> };
  embedding?: { modelId: string; provider: string; dimensions: number };
  proposition?: {
    pillars: Array<{ id: string; label: string; keywords: string[]; keywordCount: number }>;
    allKeywords: string[];
    identityStrength: number;
    identityLabel: string;
  };
  pipeline?: { publicSearchPath: string; ragPath: string; storage: string };
}

export async function loadSearchCorpusPanel(ctx?: PortalAccountContext): Promise<void> {
  const container = document.getElementById('admin-ops-search-corpus');
  if (!container) return;

  const accountCtx = ctx ?? (getPortalAccountContext() as unknown as PortalAccountContext);
  if (!hasSession(accountCtx)) {
    container.innerHTML = '<p class="form-hint">Sign in as admin to view search corpus.</p>';
    return;
  }

  container.innerHTML = '<p class="form-hint">Loading search &amp; RAG corpus…</p>';

  try {
    const res = await workspaceFetch(`${accountCtx.apiBaseUrl}/admin/search-corpus`);
    const data = (await res.json()) as SearchCorpusResponse;
    if (!res.ok || !data.success || !data.proposition) {
      container.innerHTML = `<p class="form-hint">${escapeHtml(data.error || 'Could not load search corpus.')}</p>`;
      return;
    }

    const chunks = data.semanticIndex?.chunkCount ?? 0;
    const resources = data.semanticIndex?.resourceIds ?? 0;
    const model = data.embedding?.modelId ?? '—';
    const provider = data.embedding?.provider ?? '—';
    const strength = data.proposition.identityStrength;
    const label = data.proposition.identityLabel;

    const pillars = data.proposition.pillars
      .map((p) => {
        const preview = p.keywords.slice(0, 8);
        const remaining = Math.max(0, p.keywords.length - preview.length);
        return `
      <div class="search-corpus-pillar">
        <div class="search-corpus-pillar__head">
          <strong>${escapeHtml(p.label)}</strong>
          <span class="form-hint">${p.keywordCount} keywords</span>
        </div>
        <div class="search-corpus-keywords">
          ${preview.map((kw) => `<span class="search-corpus-keyword">${escapeHtml(kw)}</span>`).join('')}
          ${remaining ? `<span class="form-hint">+${remaining} more</span>` : ''}
        </div>
      </div>`;
      })
      .join('');

    container.innerHTML = `
      <div class="search-corpus-stat-row">
        <span><strong>${chunks}</strong> chunks</span>
        <span><strong>${resources}</strong> resources</span>
        <span>${escapeHtml(model)} · ${escapeHtml(provider)}</span>
      </div>
      <div class="search-corpus-identity">
        <p class="search-corpus-identity__label">
          Proposition identity <strong>${strength}%</strong> — ${escapeHtml(label)}
        </p>
        <div class="search-corpus-identity-bar" role="meter" aria-valuenow="${strength}" aria-valuemin="0" aria-valuemax="100" aria-label="Proposition identity alignment">
          <div class="search-corpus-identity-bar__fill" style="width: ${strength}%"></div>
        </div>
      </div>
      <details class="search-corpus-pillars">
        <summary>Identity pillars &amp; keywords</summary>
        <div class="search-corpus-pillars__body">
          ${pillars}
        </div>
      </details>
      <p class="form-hint">Storage: ${escapeHtml(data.pipeline?.storage ?? 'Neon')} · Public: <code>${escapeHtml(data.pipeline?.publicSearchPath ?? '/api/resources/search')}</code></p>
    `;
  } catch {
    container.innerHTML = '<p class="form-hint">Could not reach the API.</p>';
  }
}

export async function loadAdminOpsPanel(ctx?: PortalAccountContext): Promise<void> {
  trackPortalAction('loadAdminOpsPanel');
  const accountCtx = ctx ?? (getPortalAccountContext() as unknown as PortalAccountContext);
  await loadSiteUsageSnapshot(accountCtx);
  await loadTokenRedemptionQueue(accountCtx);
  await loadSearchCorpusPanel(accountCtx);
}

export function bindAdminOpsPanel(resolveCtx: () => PortalAccountContext): void {
  document.getElementById('refresh-admin-ops-usage')?.addEventListener('click', () => {
    void loadSiteUsageSnapshot(resolveCtx());
  });
  document.getElementById('admin-ops-refresh-all')?.addEventListener('click', () => {
    void loadAdminOpsPanel(resolveCtx());
  });
  document.getElementById('refresh-admin-ops-token-queue')?.addEventListener('click', () => {
    void loadTokenRedemptionQueue(resolveCtx());
  });
  document.getElementById('refresh-admin-ops-search-corpus')?.addEventListener('click', () => {
    void loadSearchCorpusPanel(resolveCtx());
  });
}
