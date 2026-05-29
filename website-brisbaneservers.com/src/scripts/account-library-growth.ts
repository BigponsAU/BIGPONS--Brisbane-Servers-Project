/**
 * Account workspace — library growth panel (admin).
 */
import type { PortalAccountContext } from './portal-account-extensions';

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

export async function loadLibraryGrowthPanel(ctx: PortalAccountContext): Promise<void> {
  const token = ctx.getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(`${ctx.apiBaseUrl}/admin/library-growth`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
      lastCycleAt?: string | null;
      nextCycleAt?: string | null;
    };

    const enabledEl = document.getElementById('growth-enabled') as HTMLInputElement | null;
    if (enabledEl) enabledEl.checked = cfg.enabled;
    const intervalEl = document.getElementById('growth-interval-hours') as HTMLInputElement | null;
    if (intervalEl) intervalEl.value = String(cfg.intervalHours);
    const maxEl = document.getElementById('growth-max-proposals') as HTMLInputElement | null;
    if (maxEl) maxEl.value = String(cfg.maxProposalsPerCycle);
    const caseEl = document.getElementById('growth-case-studies') as HTMLInputElement | null;
    if (caseEl) caseEl.checked = cfg.generateCaseStudies;

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
    if (armBtn) {
      armBtn.disabled = !cfg.enabled || cfg.intervalHours <= 0 || armed;
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
    const token = ctx.getAuthToken();
    const res = await fetch(`${ctx.apiBaseUrl}/admin/growth-proposals?status=pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
        <button type="button" class="btn btn-primary btn-sm growth-approve">Approve &amp; generate</button>
        <button type="button" class="btn btn-secondary btn-sm growth-reject">Reject</button>
      </div>
    </article>`
    )
    .join('');

  container.querySelectorAll('.growth-proposal-card').forEach((card) => {
    const id = (card as HTMLElement).dataset.proposalId;
    if (!id) return;
    card.querySelector('.growth-approve')?.addEventListener('click', () => void actOnProposal(ctx, id, 'approve'));
    card.querySelector('.growth-reject')?.addEventListener('click', () => void actOnProposal(ctx, id, 'reject'));
  });
}

async function actOnProposal(
  ctx: PortalAccountContext,
  proposalId: string,
  action: 'approve' | 'reject'
): Promise<void> {
  const token = ctx.getAuthToken();
  if (!token) return;
  setGrowthStatus(action === 'approve' ? 'Generating resource…' : 'Rejecting…');

  try {
    const res = await fetch(`${ctx.apiBaseUrl}/admin/growth-proposals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
          ? `Case study materialized${data.published ? ' and published' : ''}. Draft page merges on next static build; promote in case-studies.ts when ready.`
          : `Materialized${data.published ? ' and published' : ' as draft'}: ${data.resource?.title ?? 'resource'}`
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

export function bindLibraryGrowthPanel(ctx: PortalAccountContext): void {
  document.getElementById('growth-save-config')?.addEventListener('click', async () => {
    const token = ctx.getAuthToken();
    if (!token) return;
    const body = {
      enabled: (document.getElementById('growth-enabled') as HTMLInputElement)?.checked ?? false,
      intervalHours: Number((document.getElementById('growth-interval-hours') as HTMLInputElement)?.value ?? 168),
      maxProposalsPerCycle: Number((document.getElementById('growth-max-proposals') as HTMLInputElement)?.value ?? 5),
      generateCaseStudies: (document.getElementById('growth-case-studies') as HTMLInputElement)?.checked ?? true,
    };
    const res = await fetch(`${ctx.apiBaseUrl}/admin/library-growth`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setGrowthStatus(data.success ? 'Growth settings saved.' : data.error || 'Save failed.', !data.success);
    if (data.success) await loadLibraryGrowthPanel(ctx);
  });

  document.getElementById('growth-arm-schedule')?.addEventListener('click', async () => {
    const token = ctx.getAuthToken();
    if (!token) return;
    setGrowthStatus('Activating schedule…');
    const res = await fetch(`${ctx.apiBaseUrl}/admin/library-growth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'arm' }),
    });
    const data = await res.json();
    setGrowthStatus(
      data.success
        ? 'Schedule activated. Automatic cycles will run when due; proposals still need your approval.'
        : data.error || 'Could not activate schedule.',
      !data.success
    );
    if (data.success) await loadLibraryGrowthPanel(ctx);
  });

  document.getElementById('growth-pause-schedule')?.addEventListener('click', async () => {
    const token = ctx.getAuthToken();
    if (!token) return;
    setGrowthStatus('Pausing schedule…');
    const res = await fetch(`${ctx.apiBaseUrl}/admin/library-growth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'pause' }),
    });
    const data = await res.json();
    setGrowthStatus(data.success ? 'Schedule paused. Use Run cycle now for manual planning.' : data.error || 'Pause failed.', !data.success);
    if (data.success) await loadLibraryGrowthPanel(ctx);
  });

  document.getElementById('growth-run-cycle')?.addEventListener('click', async () => {
    const token = ctx.getAuthToken();
    if (!token) return;
    setGrowthStatus('Running growth cycle…');
    const res = await fetch(`${ctx.apiBaseUrl}/admin/library-growth`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setGrowthStatus(data.error || 'Cycle failed.', true);
      return;
    }
    setGrowthStatus(`Cycle created ${data.created} proposal(s), skipped ${data.skipped}.`);
    await loadLibraryGrowthPanel(ctx);
  });

  document.getElementById('growth-refresh-queue')?.addEventListener('click', () => void loadLibraryGrowthPanel(ctx));
}
