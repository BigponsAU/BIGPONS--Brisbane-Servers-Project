import {
  computeNextCycleAt,
  loadLibraryGrowthConfig,
  saveLibraryGrowthConfig,
} from './config';
import { planGrowthProposals } from './planner';
import { loadGrowthProposals, saveGrowthProposals } from './proposals-store';
import type { GrowthProposal } from './types';

export interface GrowthCycleResult {
  created: number;
  skipped: number;
  proposals: GrowthProposal[];
  nextCycleAt: string | null;
  ran: boolean;
  reason?: string;
}

export async function runLibraryGrowthCycle(): Promise<GrowthCycleResult> {
  const config = await loadLibraryGrowthConfig();
  const existing = await loadGrowthProposals();
  const pendingKeys = new Set(
    existing
      .filter((p) => p.status === 'pending')
      .map((p) => `${p.industry}:${p.topic}:${p.kind}`)
  );

  const planned = await planGrowthProposals(config);
  const now = new Date().toISOString();
  const created: GrowthProposal[] = [];
  let skipped = 0;

  for (const plan of planned) {
    const key = `${plan.industry}:${plan.topic}:${plan.kind}`;
    if (pendingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    const proposal: GrowthProposal = {
      ...plan,
      id: `growth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    created.push(proposal);
    pendingKeys.add(key);
  }

  if (created.length > 0) {
    await saveGrowthProposals([...existing, ...created]);
  }

  const lastCycleAt = new Date().toISOString();
  const nextCycleAt = computeNextCycleAt({ ...config, lastCycleAt });
  await saveLibraryGrowthConfig({
    ...config,
    lastCycleAt,
    nextCycleAt,
  });

  return {
    created: created.length,
    skipped,
    proposals: created,
    nextCycleAt,
    ran: true,
  };
}

/** Run a cycle only when scheduling is enabled and `nextCycleAt` has passed (or never set). */
export async function runDueLibraryGrowthCycle(): Promise<GrowthCycleResult> {
  const config = await loadLibraryGrowthConfig();

  if (!config.enabled) {
    return {
      created: 0,
      skipped: 0,
      proposals: [],
      nextCycleAt: config.nextCycleAt,
      ran: false,
      reason: 'Scheduled growth is not configured (enable in workspace)',
    };
  }

  if (!config.scheduleArmed) {
    return {
      created: 0,
      skipped: 0,
      proposals: [],
      nextCycleAt: null,
      ran: false,
      reason: 'Schedule is not activated — use Activate schedule in the account workspace',
    };
  }

  if (config.intervalHours <= 0) {
    return {
      created: 0,
      skipped: 0,
      proposals: [],
      nextCycleAt: null,
      ran: false,
      reason: 'Interval is manual-only (0 hours)',
    };
  }

  const now = Date.now();
  if (config.nextCycleAt && new Date(config.nextCycleAt).getTime() > now) {
    return {
      created: 0,
      skipped: 0,
      proposals: [],
      nextCycleAt: config.nextCycleAt,
      ran: false,
      reason: 'Next cycle not yet due',
    };
  }

  return runLibraryGrowthCycle();
}
