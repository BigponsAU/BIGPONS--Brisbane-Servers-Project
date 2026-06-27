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
  nvidiaConfigured?: boolean;
  nvidiaModel?: string;
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
      const parts: string[] = [`Active provider: ${provider}.`];
      if (data.nvidiaConfigured) {
        parts.push(`NVIDIA NIM${data.nvidiaModel ? ` (${data.nvidiaModel})` : ''} configured.`);
      }
      if (data.workersAiConfigured) {
        parts.push('Workers AI fallback available.');
      }
      if (!data.nvidiaConfigured && !data.workersAiConfigured) {
        parts.push('No external LLM — template engine only.');
      }
      parts.push('Generate and Improve share the same daily cap. Resets midnight UTC.');
      metaEl.textContent = parts.join(' ');
    }
  } catch {
    summaryEl.textContent = 'Could not reach the API to load usage.';
  }

  await loadTokenRedemptionQueue(accountCtx);
  await loadSearchCorpusPanel(accountCtx);
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
    const dim = data.embedding?.dimensions ?? '—';
    const strength = data.proposition.identityStrength;
    const label = data.proposition.identityLabel;

    const pillars = data.proposition.pillars
      .map(
        (p) => `
      <div class="search-corpus-pillar">
        <h4>${escapeHtml(p.label)} <span class="form-hint">(${p.keywordCount} keywords)</span></h4>
        <div class="search-corpus-keywords">
          ${p.keywords
            .slice(0, 14)
            .map((kw) => `<span class="search-corpus-keyword">${escapeHtml(kw)}</span>`)
            .join('')}
          ${p.keywords.length > 14 ? `<span class="form-hint">+${p.keywords.length - 14} more</span>` : ''}
        </div>
      </div>`
      )
      .join('');

    container.innerHTML = `
      <div class="search-corpus-stat-row">
        <span><strong>Semantic chunks:</strong> ${chunks}</span>
        <span><strong>Indexed resources:</strong> ${resources}</span>
        <span><strong>Embedding:</strong> ${escapeHtml(model)} (${escapeHtml(provider)}, ${dim}d)</span>
      </div>
      <div>
        <p class="section-subtitle" style="margin-bottom: 0.35rem;">
          <strong>Proposition identity strength:</strong> ${strength}% — ${escapeHtml(label)}
        </p>
        <div class="search-corpus-identity-bar" role="meter" aria-valuenow="${strength}" aria-valuemin="0" aria-valuemax="100" aria-label="Proposition identity alignment">
          <div class="search-corpus-identity-bar__fill" style="width: ${strength}%"></div>
        </div>
        <p class="form-hint">Cosine alignment between value-proposition embedding and corpus vector centroid.</p>
      </div>
      <div>
        <h4 class="card-title" style="font-size: var(--text-sm); margin-bottom: var(--space-sm);">Identity pillars &amp; keywords</h4>
        ${pillars}
      </div>
      <p class="form-hint">Storage: ${escapeHtml(data.pipeline?.storage ?? 'Neon')} · Public: <code>${escapeHtml(data.pipeline?.publicSearchPath ?? '/api/resources/search')}</code></p>
    `;
  } catch {
    container.innerHTML = '<p class="form-hint">Could not reach the API.</p>';
  }
}

export function bindAdminOpsPanel(resolveCtx: () => PortalAccountContext): void {
  document.getElementById('refresh-admin-ops-usage')?.addEventListener('click', () => {
    void loadAdminOpsPanel(resolveCtx());
  });
  document.getElementById('refresh-admin-ops-token-queue')?.addEventListener('click', () => {
    void loadTokenRedemptionQueue(resolveCtx());
  });
  document.getElementById('refresh-admin-ops-search-corpus')?.addEventListener('click', () => {
    void loadSearchCorpusPanel(resolveCtx());
  });
}
