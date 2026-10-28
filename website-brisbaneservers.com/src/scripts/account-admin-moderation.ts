/**
 * Admin moderation panel — pending community uploads queue + inline preview.
 */
import { workspaceFetch } from '../lib/client-api';
import { escapeHtml, runWorkspaceGuardedAction, setElementBusy, workspaceErrorMessage } from './account-workspace-utils';
import { getPortalAccountContext, showAuthBanner } from './account-workspace-runtime';
import type { PortalAccountContext } from './portal-account-extensions';
import { showConfirmDialog } from './portal-confirm-dialog';
import { trackPortalAction } from './portal-markov-tracker';

export type ModerationItem = {
  id: string;
  userId: string;
  resourceId: string;
  type: string;
  createdAt?: string;
  tokensAwarded?: number;
  analysis?: {
    voiceScore?: number;
    notes?: string;
  };
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

function suggestedTokenAward(item: ModerationItem, multiplier = 10): number {
  const score = item.analysis?.voiceScore;
  if (typeof score !== 'number') return 0;
  return Math.round(Math.max(0, score) * multiplier);
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
  const voiceScore =
    typeof item.analysis?.voiceScore === 'number'
      ? item.analysis.voiceScore.toFixed(2)
      : '—';
  const tokensOnApprove = suggestedTokenAward(item);
  const alreadyAwarded = item.tokensAwarded ?? 0;

  panel.innerHTML = `
    <header class="moderation-detail-header">
      <h3>${escapeHtml(item.payload?.title || 'Untitled upload')}</h3>
      <p class="moderation-meta">${escapeHtml(item.type)} · ${escapeHtml(item.payload?.industry || '—')} · ${escapeHtml(item.payload?.topic || '—')}</p>
    </header>
    <dl class="moderation-detail-meta">
      <div><dt>User</dt><dd><code>${escapeHtml(item.userId)}</code></dd></div>
      <div><dt>Resource ID</dt><dd><code>${escapeHtml(item.resourceId || '—')}</code></dd></div>
      <div><dt>Submitted</dt><dd>${escapeHtml(created)}</dd></div>
      <div><dt>Voice score</dt><dd>${escapeHtml(voiceScore)}</dd></div>
      <div><dt>Tokens on approve</dt><dd>${escapeHtml(String(tokensOnApprove))}${
        alreadyAwarded > 0 ? ` <span class="form-hint">(ledger already has ${alreadyAwarded})</span>` : ''
      }</dd></div>
    </dl>
    <div class="moderation-detail-body">
      <h4>Content preview</h4>
      <pre class="moderation-detail-snippet">${escapeHtml(snippet || 'No preview text supplied.')}</pre>
      ${
        item.analysis?.notes
          ? `<p class="form-hint">${escapeHtml(item.analysis.notes)}</p>`
          : ''
      }
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
    const approveBtn = panel.querySelector('[data-moderation-approve]') as HTMLButtonElement | null;
    const rejectBtn = panel.querySelector('[data-moderation-reject]') as HTMLButtonElement | null;
    void runWorkspaceGuardedAction(`moderation:${item.id}:approve`, {
      confirm: () =>
        showConfirmDialog({
          title: 'Approve upload',
          message: 'Publish this community contribution?',
          details:
            tokensOnApprove > 0
              ? `Awards about ${tokensOnApprove} tokens to the contributor (if not already granted), then publishes the resource.`
              : 'Approved items become available in Resources and may appear on the public site when published.',
          confirmLabel: 'Approve',
          variant: 'primary',
        }),
      onBusy: (busy) => {
        setElementBusy(approveBtn, busy, busy ? 'Approving…' : 'Approve');
        setElementBusy(rejectBtn, busy);
      },
      run: () => moderateContribution(ctx, item.id, 'approve'),
    });
  });
  panel.querySelector('[data-moderation-reject]')?.addEventListener('click', () => {
    const approveBtn = panel.querySelector('[data-moderation-approve]') as HTMLButtonElement | null;
    const rejectBtn = panel.querySelector('[data-moderation-reject]') as HTMLButtonElement | null;
    void runWorkspaceGuardedAction(`moderation:${item.id}:reject`, {
      confirm: () =>
        showConfirmDialog({
          title: 'Reject upload',
          message: 'Reject this contribution and archive its draft?',
          details:
            alreadyAwarded > 0
              ? `Any tokens already granted for this upload (${alreadyAwarded}) will be clawed back.`
              : 'Removes it from the moderation queue without publishing. Draft resource is archived.',
          confirmLabel: 'Reject',
          variant: 'danger',
        }),
      onBusy: (busy) => {
        setElementBusy(rejectBtn, busy, busy ? 'Rejecting…' : 'Reject');
        setElementBusy(approveBtn, busy);
      },
      run: () => moderateContribution(ctx, item.id, 'reject'),
    });
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
    showAuthBanner('Sign in again to moderate uploads.', 'error');
    return;
  }
  const endpoint = action === 'approve' ? 'approve' : 'reject';
  trackPortalAction(action === 'approve' ? 'moderateContributionApprove' : 'moderateContributionReject');

  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/community/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contributionId }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      tokensAwarded?: number;
      tokensGrantedNow?: number;
      tokensClawedBack?: number;
    };

    if (!res.ok || !data.success) {
      const message = data.error || `Could not ${action} contribution (${res.status}).`;
      showAuthBanner(message, 'error');
      await loadModerationQueue(ctx);
      return;
    }

    if (action === 'approve') {
      const granted = data.tokensGrantedNow ?? data.tokensAwarded ?? 0;
      showAuthBanner(
        granted > 0
          ? `Contribution approved. ${granted} token${granted === 1 ? '' : 's'} granted.`
          : 'Contribution approved and published.',
        'success',
      );
    } else {
      const clawed = data.tokensClawedBack ?? 0;
      showAuthBanner(
        clawed > 0
          ? `Contribution rejected. ${clawed} token${clawed === 1 ? '' : 's'} clawed back.`
          : 'Contribution rejected and draft archived.',
        'success',
      );
    }
  } catch {
    showAuthBanner(`Could not reach API to ${action} contribution.`, 'error');
  }

  await loadModerationQueue(ctx);
}

export async function loadModerationQueue(ctx: PortalAccountContext): Promise<void> {
  trackPortalAction('loadModerationQueue');
  const container = document.getElementById('moderation-queue');
  if (!container) return;

  if (!hasSession(ctx)) {
    container.innerHTML = '<p class="status-message">Sign in again to view the moderation queue.</p>';
    setQueueSummary(0);
    resetModerationDetail();
    await loadPendingIndustryTags(ctx);
    return;
  }

  container.innerHTML = '<p class="status-message">Loading pending uploads…</p>';
  resetModerationDetail();

  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/community/contributions`);
    if (!res.ok) {
      container.innerHTML = '<p class="status-message">Admin access required to view the moderation queue.</p>';
      setQueueSummary(0);
      await loadPendingIndustryTags(ctx);
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
      await loadPendingIndustryTags(ctx);
      return;
    }

    container.innerHTML = items
      .map((item) => {
        const title = item.payload?.title || 'Untitled upload';
        const score =
          typeof item.analysis?.voiceScore === 'number'
            ? ` · voice ${item.analysis.voiceScore.toFixed(2)}`
            : '';
        const meta = `${item.type} · ${item.payload?.industry || '—'}${score}`;
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
  } catch (error) {
    container.innerHTML = `<p class="status-message">${escapeHtml(workspaceErrorMessage(error, 'Could not load moderation queue.'))}</p>`;
    setQueueSummary(0);
  }

  bindAdminIndustryCreate(ctx);
  await loadPendingIndustryTags(ctx);
}

function bindAdminIndustryCreate(ctx: PortalAccountContext): void {
  const form = document.getElementById('admin-create-industry-form') as HTMLFormElement | null;
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('admin-create-industry-name') as HTMLInputElement | null;
    const label = input?.value.trim() || '';
    if (!label) {
      showAuthBanner('Name the industry first.', 'error');
      return;
    }
    void runWorkspaceGuardedAction('admin-create-industry', {
      run: async () => {
        const response = await workspaceFetch(`${ctx.apiBaseUrl}/resources/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Could not create industry');
        }
        if (input) input.value = '';
        showAuthBanner(
          payload.tag?.status === 'approved'
            ? `${payload.tag.label} is on the industry list.`
            : `${payload.tag?.label || label} submitted.`,
          'success',
        );
        await loadPendingIndustryTags(ctx);
      },
    });
  });
}

async function loadPendingIndustryTags(ctx: PortalAccountContext): Promise<void> {
  const host = document.getElementById('industry-tag-moderation');
  if (!host) return;
  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/resources/tags`);
    const data = await res.json();
    const pending = Array.isArray(data.pending) ? data.pending : [];
    if (!pending.length) {
      host.innerHTML = '<p class="status-message">No industry applications waiting for approval.</p>';
      return;
    }
    host.innerHTML = pending
      .map(
        (tag: { slug: string; label: string; applicant?: string; proposedBy?: string }) => `
        <div class="moderation-queue-item" data-tag-slug="${escapeHtml(tag.slug)}">
          <span class="moderation-queue-item__title">${escapeHtml(tag.label)}</span>
          <span class="moderation-queue-item__meta">${escapeHtml(tag.applicant || tag.proposedBy || 'application')} · ${escapeHtml(tag.slug)}</span>
          <span class="moderation-queue-item__actions">
            <button type="button" class="btn btn-success btn-sm" data-tag-action="approve">Approve</button>
            <button type="button" class="btn btn-danger btn-sm" data-tag-action="reject">Reject</button>
          </span>
        </div>`,
      )
      .join('');
    host.querySelectorAll('[data-tag-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = (btn as HTMLElement).closest('[data-tag-slug]') as HTMLElement | null;
        const slug = row?.dataset.tagSlug;
        const action = (btn as HTMLElement).dataset.tagAction as 'approve' | 'reject';
        if (!slug || !action) return;
        void runWorkspaceGuardedAction(`tag:${action}:${slug}`, {
          confirm: () =>
            showConfirmDialog({
              title: action === 'approve' ? 'Approve industry application' : 'Reject industry application',
              message:
                action === 'approve'
                  ? `Add ${slug} to the public industry list?`
                  : `Reject ${slug}? Authors keep their drafts but cannot publish under this industry.`,
              confirmLabel: action === 'approve' ? 'Approve' : 'Reject',
              variant: action === 'approve' ? 'primary' : 'danger',
            }),
          run: async () => {
            const response = await workspaceFetch(`${ctx.apiBaseUrl}/resources/tags`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug, action }),
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
              throw new Error(payload.error || 'Could not update industry application');
            }
            await loadPendingIndustryTags(ctx);
          },
        });
      });
    });
  } catch (error) {
    host.innerHTML = `<p class="status-message">${escapeHtml(workspaceErrorMessage(error, 'Could not load industry applications.'))}</p>`;
  }
}
