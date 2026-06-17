/**
 * Account workspace — library growth panel (admin).
 */
import { workspaceFetch } from '../lib/client-api';
import type { PortalAccountContext } from './portal-account-extensions';
import { getPortalAccountContext } from './account-workspace-runtime';

function formatProposalKind(kind: string): string {
  return kind === 'case_study' ? 'Case study' : 'Resource guide';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setGrowthStatus(message: string, isError = false): void {
  const el = document.getElementById('growth-status');
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? 'var(--portal-error-dark, #991b1b)' : '';
}

function hasSession(ctx: PortalAccountContext): boolean {
  return ctx.hasWorkspaceSession?.() ?? Boolean(ctx.getAuthToken());
}

export async function loadLibraryGrowthPanel(ctx: PortalAccountContext): Promise<void> {
  if (!hasSession(ctx)) {
    setGrowthStatus('Sign in again to manage library growth.', true);
    return;
  }

  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/library-growth`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      setGrowthStatus(data.error || 'Could not load growth settings.', true);
      return;
    }

    const cfg = data.config as {
      enabled: boolean;
      scheduleArmed?: boolean;
      scheduleArmedAt?: string | null;
      scheduleArmedBy?: string | null;
      intervalHours: number;
      maxProposalsPerCycle: number;
      generateCaseStudies: boolean;
      reviewOnlyPublish?: boolean;
      autoMaterializePending?: boolean;
      maxDailyGrowthUnits?: number;
      maxUnitsPerCycle?: number;
      lastCycleAt?: string | null;
      nextCycleAt?: string | null;
    };

    const estimate = data.estimate as {
      proposalsWouldCreate?: number;
      materializeWouldRun?: number;
      unitsThisCycle?: number;
      dailyGrowthCap?: number;
      dailyGrowthUsed?: number;
      dailyGrowthRemaining?: number;
      maxUnitsPerCycle?: number;
      wouldExceedBudget?: boolean;
      budgetMessage?: string | null;
      reviewOnlyPublish?: boolean;
      workersAiNote?: string;
      workersAi?: { cap: number; used: number; remaining: number };
    } | undefined;

    const enabledEl = document.getElementById('growth-enabled') as HTMLInputElement | null;
    if (enabledEl) enabledEl.checked = cfg.enabled;
    const intervalEl = document.getElementById('growth-interval-hours') as HTMLInputElement | null;
    if (intervalEl) intervalEl.value = String(cfg.intervalHours);
    const maxEl = document.getElementById('growth-max-proposals') as HTMLInputElement | null;
    if (maxEl) maxEl.value = String(cfg.maxProposalsPerCycle);
    const caseEl = document.getElementById('growth-case-studies') as HTMLInputElement | null;
    if (caseEl) caseEl.checked = cfg.generateCaseStudies;
    const autoEl = document.getElementById('growth-auto-materialize') as HTMLInputElement | null;
    if (autoEl) autoEl.checked = Boolean(cfg.autoMaterializePending);
    const dailyBudgetEl = document.getElementById('growth-daily-budget') as HTMLInputElement | null;
    if (dailyBudgetEl) dailyBudgetEl.value = String(cfg.maxDailyGrowthUnits ?? 20);
    const maxUnitsCycleEl = document.getElementById('growth-max-units-cycle') as HTMLInputElement | null;
    if (maxUnitsCycleEl) maxUnitsCycleEl.value = String(cfg.maxUnitsPerCycle ?? 5);

    const scheduleState = document.getElementById('growth-schedule-state');
    const armed = Boolean(cfg.scheduleArmed);
    if (scheduleState) {
      if (!cfg.enabled) {
        scheduleState.textContent =
          'Schedule: not configured — enable “Allow scheduled cycles” and save settings.';
      } else if (!armed) {
        scheduleState.textContent =
          'Schedule: paused — automatic cycles will not run until you click Activate schedule.';
      } else {
        scheduleState.textContent = `Schedule: active${cfg.scheduleArmedBy ? ` (activated by ${cfg.scheduleArmedBy})` : ''}.`;
      }
    }

    const armBtn = document.getElementById('growth-arm-schedule') as HTMLButtonElement | null;
    const pauseBtn = document.getElementById('growth-pause-schedule') as HTMLButtonElement | null;
    const budgetBlocked = Boolean(estimate?.wouldExceedBudget);
    if (armBtn) {
      armBtn.disabled = !cfg.enabled || cfg.intervalHours <= 0 || armed || budgetBlocked;
      armBtn.title = budgetBlocked
        ? (estimate?.budgetMessage ?? 'Next cycle would exceed growth budget')
        : '';
    }
    if (pauseBtn) {
      pauseBtn.disabled = !armed;
    }

    const meta = document.getElementById('growth-cycle-meta');
    if (meta) {
      const parts = [
        cfg.lastCycleAt ? `Last cycle: ${new Date(cfg.lastCycleAt).toLocaleString()}` : null,
        armed && cfg.nextCycleAt
          ? `Next automatic cycle: ${new Date(cfg.nextCycleAt).toLocaleString()}`
          : 'Automatic cycles: off (use Run cycle now or Activate schedule)',
        `Pending proposals: ${data.stats?.pending ?? 0}`,
      ].filter(Boolean);
      meta.textContent = parts.join(' · ');
    }

    const budgetSummary = document.getElementById('growth-budget-summary');
    const budgetNote = document.getElementById('growth-budget-note');
    const budgetPanel = document.getElementById('growth-budget-panel');
    if (budgetSummary && estimate) {
      const lines = [
        `Today: ${estimate.dailyGrowthUsed ?? 0} / ${estimate.dailyGrowthCap ?? 20} growth units used (${estimate.dailyGrowthRemaining ?? 0} left)`,
        `Next cycle: ~${estimate.proposalsWouldCreate ?? 0} new proposal(s)${estimate.materializeWouldRun ? `, ~${estimate.materializeWouldRun} draft(s) (~${estimate.unitsThisCycle ?? 0} units)` : ''}`,
        estimate.reviewOnlyPublish !== false ? 'Publish: manual only (drafts until Resources)' : 'Publish: may auto-publish by voice score',
      ];
      budgetSummary.textContent = lines.join(' · ');
      if (budgetPanel) {
        budgetPanel.classList.toggle('library-growth-budget--warn', budgetBlocked);
      }
      if (budgetNote) {
        const ai = estimate.workersAi;
        const aiLine = ai
          ? `Your Workers AI allowance today: ${ai.used}/${ai.cap} (${ai.remaining} left). `
          : '';
        budgetNote.textContent = `${aiLine}${estimate.workersAiNote ?? ''}${budgetBlocked && estimate.budgetMessage ? ` ${estimate.budgetMessage}` : ''}`;
      }
    }

    await renderGrowthProposals(ctx, data.pending ?? []);
  } catch {
    setGrowthStatus('Could not reach growth API.', true);
  }
}

async function renderGrowthProposals(
  ctx: PortalAccountContext,
  cached: Array<{
    id: string;
    kind: string;
    title: string;
    industry: string;
    topic: string;
    rationale: string;
    status: string;
  }>
): Promise<void> {
  const container = document.getElementById('growth-proposals-queue');
  if (!container) return;

  let items = cached;
  if (!items.length) {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/growth-proposals?status=pending`);
    const data = await res.json();
    items = Array.isArray(data.proposals) ? data.proposals : [];
  }

  if (!items.length) {
    container.innerHTML =
      '<p class="status-message">No pending proposals. Run a cycle to plan new topics from analytics gaps and contributor interest.</p>';
    return;
  }

  container.innerHTML = items
    .map(
      (p) => `
    <article class="growth-proposal-card" data-proposal-id="${escapeHtml(p.id)}">
      <header>
        <h4>${escapeHtml(p.title)}</h4>
        <p class="growth-proposal-meta">${escapeHtml(formatProposalKind(p.kind))} · ${escapeHtml(p.industry)} · ${escapeHtml(p.topic)}</p>
      </header>
      <p>${escapeHtml(p.rationale)}</p>
      <div class="growth-proposal-actions">
        <button type="button" class="btn btn-primary btn-sm growth-approve">Approve &amp; generate draft</button>
        <button type="button" class="btn btn-secondary btn-sm growth-reject">Reject</button>
      </div>
    </article>`
    )
    .join('');

  container.querySelectorAll('.growth-proposal-card').forEach((card) => {
    const id = (card as HTMLElement).dataset.proposalId;
    if (!id) return;
    card.querySelector('.growth-approve')?.addEventListener('click', () => {
      void actOnProposal(getPortalAccountContext() as unknown as PortalAccountContext, id, 'approve');
    });
    card.querySelector('.growth-reject')?.addEventListener('click', () => {
      void actOnProposal(getPortalAccountContext() as unknown as PortalAccountContext, id, 'reject');
    });
  });
}

async function actOnProposal(
  ctx: PortalAccountContext,
  proposalId: string,
  action: 'approve' | 'reject'
): Promise<void> {
  if (!hasSession(ctx)) {
    setGrowthStatus('Sign in again to update growth proposals.', true);
    return;
  }
  setGrowthStatus(action === 'approve' ? 'Generating resource…' : 'Rejecting…');

  try {
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/growth-proposals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proposalId, action }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setGrowthStatus(data.error || 'Action failed.', true);
      return;
    }
    const isCaseStudy = data.proposal?.kind === 'case_study';
    setGrowthStatus(
      action === 'approve'
        ? isCaseStudy
          ? `Case study draft created${data.published ? ' (published)' : ''}. Review in Resources before going live.`
          : `Draft created${data.published ? ' (published)' : ''}: ${data.resource?.title ?? 'resource'} — publish from Resources when ready.`
        : 'Proposal rejected.'
    );
    await loadLibraryGrowthPanel(ctx);
    if (action === 'approve' && data.resource?.id) {
      ctx.navigateToPanel('resources');
      window.setTimeout(() => ctx.selectResource?.(data.resource.id), 200);
    }
  } catch {
    setGrowthStatus('Request failed.', true);
  }
}

export function bindLibraryGrowthPanel(resolveCtx: () => PortalAccountContext): void {
  document.getElementById('growth-save-config')?.addEventListener('click', async () => {
    const ctx = resolveCtx();
    if (!hasSession(ctx)) {
      setGrowthStatus('Sign in again to save growth settings.', true);
      return;
    }
    const body = {
      enabled: (document.getElementById('growth-enabled') as HTMLInputElement)?.checked ?? false,
      intervalHours: Number((document.getElementById('growth-interval-hours') as HTMLInputElement)?.value ?? 168),
      maxProposalsPerCycle: Number((document.getElementById('growth-max-proposals') as HTMLInputElement)?.value ?? 5),
      generateCaseStudies: (document.getElementById('growth-case-studies') as HTMLInputElement)?.checked ?? true,
      autoMaterializePending:
        (document.getElementById('growth-auto-materialize') as HTMLInputElement)?.checked ?? false,
      maxDailyGrowthUnits: Number(
        (document.getElementById('growth-daily-budget') as HTMLInputElement)?.value ?? 20
      ),
      maxUnitsPerCycle: Number(
        (document.getElementById('growth-max-units-cycle') as HTMLInputElement)?.value ?? 5
      ),
    };
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/library-growth`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setGrowthStatus(data.success ? 'Growth settings saved.' : data.error || 'Save failed.', !data.success);
    if (data.success) await loadLibraryGrowthPanel(ctx);
  });

  document.getElementById('growth-arm-schedule')?.addEventListener('click', async () => {
    const ctx = resolveCtx();
    if (!hasSession(ctx)) {
      setGrowthStatus('Sign in again to save growth settings.', true);
      return;
    }
    setGrowthStatus('Activating schedule…');
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/library-growth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'arm' }),
    });
    const data = await res.json();
    setGrowthStatus(
      data.success
        ? 'Schedule activated. Edge cron checks every 6 hours when a cycle is due.'
        : data.error || 'Could not activate schedule.',
      !data.success
    );
    if (data.success) await loadLibraryGrowthPanel(ctx);
  });

  document.getElementById('growth-pause-schedule')?.addEventListener('click', async () => {
    const ctx = resolveCtx();
    if (!hasSession(ctx)) {
      setGrowthStatus('Sign in again to save growth settings.', true);
      return;
    }
    setGrowthStatus('Pausing schedule…');
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/library-growth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
    const data = await res.json();
    setGrowthStatus(data.success ? 'Schedule paused. Use Run cycle now for manual planning.' : data.error || 'Pause failed.', !data.success);
    if (data.success) await loadLibraryGrowthPanel(ctx);
  });

  document.getElementById('growth-run-cycle')?.addEventListener('click', async () => {
    const ctx = resolveCtx();
    if (!hasSession(ctx)) {
      setGrowthStatus('Sign in again to save growth settings.', true);
      return;
    }
    setGrowthStatus('Running growth cycle…');
    const res = await workspaceFetch(`${ctx.apiBaseUrl}/admin/library-growth`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setGrowthStatus(data.error || 'Cycle failed.', true);
      return;
    }
    const mat = data.autoMaterialize as {
      materialized?: number;
      published?: number;
      budgetBlocked?: boolean;
      budgetReason?: string;
      skippedBudget?: number;
    } | undefined;
    let matLine = '';
    if (mat?.budgetBlocked) {
      matLine = ` Auto-generate skipped: ${mat.budgetReason ?? 'growth budget exceeded'}.`;
    } else if (mat && (mat.materialized ?? 0) > 0) {
      matLine = ` Generated ${mat.materialized} draft(s)${mat.published ? ` (${mat.published} auto-published)` : ''}.`;
    }
    setGrowthStatus(`Cycle created ${data.created} proposal(s), skipped ${data.skipped}.${matLine}`);
    await loadLibraryGrowthPanel(ctx);
  });

  document.getElementById('growth-refresh-queue')?.addEventListener('click', () => void loadLibraryGrowthPanel(resolveCtx()));
}
