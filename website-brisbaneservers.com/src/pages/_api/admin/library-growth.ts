import type { APIRoute } from 'astro';
import { requireAdmin } from '~/utils/auth';
import {
  computeNextCycleAt,
  loadLibraryGrowthConfig,
  saveLibraryGrowthConfig,
} from '~/lib/library-growth/config';
import type { LibraryGrowthConfig } from '~/lib/library-growth/types';
import { loadGrowthProposals } from '~/lib/library-growth/proposals-store';
import { runLibraryGrowthCycle } from '~/lib/library-growth/run-cycle';

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

  const [config, proposals] = await Promise.all([
    loadLibraryGrowthConfig(),
    loadGrowthProposals(),
  ]);

  const pending = proposals.filter((p) => p.status === 'pending');
  const materialized = proposals.filter((p) => p.status === 'materialized');

  return jsonOk({
    config,
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
    const result = await runLibraryGrowthCycle();
    return jsonOk({ success: true, ...result });
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
