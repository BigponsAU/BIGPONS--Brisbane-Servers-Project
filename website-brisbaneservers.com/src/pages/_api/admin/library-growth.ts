import type { APIRoute } from 'astro';
import { requireAdmin } from '~/utils/auth';
import {
  computeNextCycleAt,
  loadLibraryGrowthConfig,
  saveLibraryGrowthConfig,
} from '~/lib/library-growth/config';
import type { LibraryGrowthConfig } from '~/lib/library-growth/types';
import { loadGrowthProposals } from '~/lib/library-growth/proposals-store';
import { estimateGrowthCycle } from '~/lib/library-growth/estimate-cycle';
import { runAutonomousGrowthCycle } from '~/lib/library-growth/run-cycle';

/**
 * Library growth automation — config and status.
 * GET /api/admin/library-growth
 * PATCH /api/admin/library-growth — update config
 * POST /api/admin/library-growth — run a growth cycle now
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return jsonError(authResult.error, authResult.code === 'FORBIDDEN' ? 403 : 401);
  }

  const [config, proposals, estimate] = await Promise.all([
    loadLibraryGrowthConfig(),
    loadGrowthProposals(),
    estimateGrowthCycle(undefined, {
      adminUserId: authResult.user.id,
      adminRole: authResult.user.role,
    }),
  ]);

  const pending = proposals.filter((p) => p.status === 'pending');
  const materialized = proposals.filter((p) => p.status === 'materialized');

  return jsonOk({
    config,
    estimate,
    stats: {
      pending: pending.length,
      materialized: materialized.length,
      total: proposals.length,
    },
    pending: pending.slice(0, 50),
  });
};

export const PATCH: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return jsonError(authResult.error, authResult.code === 'FORBIDDEN' ? 403 : 401);
  }

  const body = (await request.json()) as Partial<LibraryGrowthConfig>;
  const current = await loadLibraryGrowthConfig();
  const next: LibraryGrowthConfig = {
    ...current,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
    scheduleArmed: current.scheduleArmed,
    scheduleArmedAt: current.scheduleArmedAt,
    scheduleArmedBy: current.scheduleArmedBy,
    intervalHours:
      typeof body.intervalHours === 'number' && body.intervalHours >= 0
        ? body.intervalHours
        : current.intervalHours,
    maxProposalsPerCycle:
      typeof body.maxProposalsPerCycle === 'number'
        ? Math.min(Math.max(1, body.maxProposalsPerCycle), 20)
        : current.maxProposalsPerCycle,
    generateCaseStudies:
      typeof body.generateCaseStudies === 'boolean'
        ? body.generateCaseStudies
        : current.generateCaseStudies,
    autoPublishMinScore:
      body.autoPublishMinScore === null
        ? null
        : typeof body.autoPublishMinScore === 'number'
          ? body.autoPublishMinScore
          : current.autoPublishMinScore,
    reviewOnlyPublish:
      typeof body.reviewOnlyPublish === 'boolean'
        ? body.reviewOnlyPublish
        : current.reviewOnlyPublish,
    autoMaterializePending:
      typeof body.autoMaterializePending === 'boolean'
        ? body.autoMaterializePending
        : current.autoMaterializePending,
    maxDailyGrowthUnits:
      typeof body.maxDailyGrowthUnits === 'number'
        ? Math.min(Math.max(1, body.maxDailyGrowthUnits), 100)
        : current.maxDailyGrowthUnits,
    maxUnitsPerCycle:
      typeof body.maxUnitsPerCycle === 'number'
        ? Math.min(Math.max(1, body.maxUnitsPerCycle), 20)
        : current.maxUnitsPerCycle,
    unitsPerMaterialize:
      typeof body.unitsPerMaterialize === 'number'
        ? Math.min(Math.max(1, body.unitsPerMaterialize), 10)
        : current.unitsPerMaterialize,
    lastCycleAt: current.lastCycleAt,
    nextCycleAt: current.nextCycleAt,
  };

  if (!next.enabled) {
    next.scheduleArmed = false;
    next.scheduleArmedAt = null;
    next.scheduleArmedBy = null;
    next.nextCycleAt = null;
  }

  await saveLibraryGrowthConfig(next);
  return jsonOk({ config: next, success: true });
};

export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return jsonError(authResult.error, authResult.code === 'FORBIDDEN' ? 403 : 401);
  }

  let body: { action?: string } = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as { action?: string };
    }
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const action = body.action?.trim();

  if (action === 'arm') {
    const current = await loadLibraryGrowthConfig();
    if (!current.enabled) {
      return jsonError('Enable scheduled cycles and save settings before activating the schedule.', 400);
    }
    if (current.intervalHours <= 0) {
      return jsonError('Set cycle interval (hours) above 0 before activating the schedule.', 400);
    }
    const armEstimate = await estimateGrowthCycle(current, {
      adminUserId: authResult.user.id,
      adminRole: authResult.user.role,
    });
    if (armEstimate.wouldExceedBudget) {
      return jsonError(
        armEstimate.budgetMessage ??
          'Next cycle would exceed the growth budget. Adjust caps or wait for daily reset.',
        400
      );
    }
    const armed: LibraryGrowthConfig = {
      ...current,
      scheduleArmed: true,
      scheduleArmedAt: new Date().toISOString(),
      scheduleArmedBy: authResult.user.email,
      nextCycleAt: computeNextCycleAt({ ...current, scheduleArmed: true }),
    };
    await saveLibraryGrowthConfig(armed);
    return jsonOk({ config: armed, armed: true });
  }

  if (action === 'pause') {
    const current = await loadLibraryGrowthConfig();
    const paused: LibraryGrowthConfig = {
      ...current,
      scheduleArmed: false,
      scheduleArmedAt: null,
      scheduleArmedBy: null,
      nextCycleAt: null,
    };
    await saveLibraryGrowthConfig(paused);
    return jsonOk({ config: paused, armed: false });
  }

  if (action && action !== 'run') {
    return jsonError('Unknown action. Use arm, pause, or omit for run cycle now.', 400);
  }

  try {
    const config = await loadLibraryGrowthConfig();
    const estimate = await estimateGrowthCycle(config, {
      adminUserId: authResult.user.id,
      adminRole: authResult.user.role,
    });
    if (estimate.wouldExceedBudget && config.autoMaterializePending) {
      return jsonError(
        estimate.budgetMessage ??
          'This cycle would exceed the growth budget. Disable auto-generate drafts or raise caps.',
        400
      );
    }
    const result = await runAutonomousGrowthCycle();
    return jsonOk({ success: true, estimate, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Growth cycle failed';
    return jsonError(message, 500);
  }
};

function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, ...((data as object) || {}) }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
