/**
 * Admin moderation panel — pending community uploads queue + inline preview.
 */
import { workspaceFetch } from '../lib/client-api';
import { escapeHtml } from './account-workspace-utils';
import { getPortalAccountContext } from './account-workspace-runtime';
import type { PortalAccountContext } from './portal-account-extensions';

export type ModerationItem = {
  id: string;
  userId: string;
  resourceId: string;
  type: string;
  createdAt?: string;
  payload?: {
    title?: string;
    industry?: string;
    topic?: string;
    contentSnippet?: string;
  };
};

function hasSession(ctx: PortalAccountContext): boolean {
  return ctx.hasWorkspaceSession?.() ?? Boolean(ctx.getAuthToken());
}

function setQueueSummary(count: number): void {
  const el = document.getElementById('moderation-queue-summary');
  if (!el) return;
  el.textContent =
    count === 0
      ? 'Queue clear — no pending community uploads.'
      : `${count} pending upload${count === 1 ? '' : 's'} awaiting review.`;
}

function resetModerationDetail(): void {
  document.getElementById('moderation-detail-empty')?.classList.remove('hidden');
  document.getElementById('moderation-detail-panel')?.classList.add('hidden');
}

function renderModerationDetail(item: ModerationItem, ctx: PortalAccountContext): void {
  const empty = document.getElementById('moderation-detail-empty');
  const panel = document.getElementById('moderation-detail-panel');
  if (!panel) return;

  empty?.classList.add('hidden');
  panel.classList.remove('hidden');

  const snippet = item.payload?.contentSnippet || '';
  const created = item.createdAt ? new Date(item.createdAt).toLocaleString() : '—';

  panel.innerHTML = `
    <header class="moderation-detail-header">
      <h3>${escapeHtml(item.payload?.title || 'Untitled upload')}</h3>
      <p class="moderation-meta">${escapeHtml(item.type)} · ${escapeHtml(item.payload?.industry || '—')} · ${escapeHtml(item.payload?.topic || '—')}</p>
    </header>
    <dl class="moderation-detail-meta">
      <div><dt>User</dt><dd><code>${escapeHtml(item.userId)}</code></dd></div>
      <div><dt>Resource ID</dt><dd><code>${escapeHtml(item.resourceId || '—')}</code></dd></div>
      <div><dt>Submitted</dt><dd>${escapeHtml(created)}</dd></div>
    </dl>
    <div class="moderation-detail-body">
      <h4>Content preview</h4>
      <pre class="moderation-detail-snippet">${escapeHtml(snippet || 'No preview text supplied.')}</pre>
    </div>
    <footer class="moderation-detail-actions">
      <button type="button" class="btn btn-primary btn-sm" data-moderation-approve="${escapeHtml(item.id)}">Approve</button>
      <button type="button" class="btn btn-secondary btn-sm" data-moderation-reject="${escapeHtml(item.id)}">Reject</button>
      ${
        item.resourceId
          ? `<button type="button" class="btn btn-secondary btn-sm" data-moderation-open="${escapeHtml(item.resourceId)}">Open in Resources</button>`
          : ''
      }
    </footer>
  `;

  panel.querySelector('[data-moderation-approve]')?.addEventListener('click', () => {
    void moderateContribution(ctx, item.id, 'approve');
  });
  panel.querySelector('[data-moderation-reject]')?.addEventListener('click', () => {
    void moderateContribution(ctx, item.id, 'reject');
  });
  panel.querySelector('[data-moderation-open]')?.addEventListener('click', () => {
    ctx.navigateToPanel('resources');
    if (item.resourceId && ctx.selectResource) {
      window.setTimeout(() => ctx.selectResource?.(item.resourceId), 150);
    }
  });
}

async function moderateContribution(
  ctx: PortalAccountContext,
  contributionId: string,
  action: 'approve' | 'reject',
): Promise<void> {
  if (!hasSession(ctx)) {
    const container = document.getElementById('moderation-queue');
    if (container) {
      container.innerHTML = '<p class="status-message">Sign in again to moderate uploads.</p>';
    }
    return;
  }
  const endpoint = action === 'approve' ? 'approve' : 'reject';
  await workspaceFetch(`${ctx.apiBaseUrl}/community/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contributionId }),
  });
  await loadModerationQueue(ctx);
}

export async function loadModerationQueue(ctx: PortalAccountContext): Promise<void> {
  const container = document.getElementById('moderation-queue');
  if (!container) return;

  if (!hasSession(ctx)) {
    container.innerHTML = '<p class="status-message">Sign in again to view the moderation queue.</p>';
    setQueueSummary(0);
    resetModerationDetail();
    return;
  }

  container.innerHTML = '<p class="status-message">Loading pending uploads…</p>';
  resetModerationDetail();

  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/community/contributions`);
    if (!res.ok) {
      container.innerHTML = '<p class="status-message">Admin access required to view the moderation queue.</p>';
      setQueueSummary(0);
      return;
    }

    const data = await res.json();
    const items = (Array.isArray(data.contributions) ? data.contributions : []).filter(
      (c: { status: string }) => c.status === 'pending',
    ) as ModerationItem[];

    setQueueSummary(items.length);

    if (!items.length) {
      container.innerHTML =
        '<p class="status-message">No pending community uploads or workspace submissions.</p>';
      return;
    }

    container.innerHTML = items
      .map((item) => {
        const title = item.payload?.title || 'Untitled upload';
        const meta = `${item.type} · ${item.payload?.industry || '—'}`;
        return `
        <button type="button" class="moderation-queue-item" data-contribution-id="${escapeHtml(item.id)}" aria-label="Review ${escapeHtml(title)}">
          <span class="moderation-queue-item__title">${escapeHtml(title)}</span>
          <span class="moderation-queue-item__meta">${escapeHtml(meta)}</span>
        </button>`;
      })
      .join('');

    const itemById = new Map(items.map((item) => [item.id, item]));

    container.querySelectorAll('.moderation-queue-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.moderation-queue-item').forEach((el) => el.classList.remove('active'));
        btn.classList.add('active');
        const id = (btn as HTMLElement).dataset.contributionId;
        const item = id ? itemById.get(id) : undefined;
        if (item) renderModerationDetail(item, getPortalAccountContext() as unknown as PortalAccountContext);
      });
    });

    const first = container.querySelector('.moderation-queue-item') as HTMLButtonElement | null;
    first?.click();
  } catch {
    container.innerHTML = '<p class="status-message">Could not load moderation queue.</p>';
    setQueueSummary(0);
  }
}
