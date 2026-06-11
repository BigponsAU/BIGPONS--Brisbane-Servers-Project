import type { AuthRole } from '../../utils/auth';
import { getUserUsageSummary } from '../inference/usage-ledger';
import { loadLibraryGrowthConfig } from './config';
import { getGrowthDailyUsage, unitsPerMaterialize } from './growth-usage-budget';
import { planGrowthProposals } from './planner';
import { loadGrowthProposals } from './proposals-store';
import type { LibraryGrowthConfig } from './types';

export interface GrowthCycleEstimate {
  proposalsWouldCreate: number;
  proposalsSkippedDuplicate: number;
  pendingInQueue: number;
  materializeWouldRun: number;
  unitsPerMaterialize: number;
  unitsThisCycle: number;
  dailyGrowthCap: number;
  dailyGrowthUsed: number;
  dailyGrowthRemaining: number;
  maxUnitsPerCycle: number;
  wouldExceedBudget: boolean;
  budgetMessage: string | null;
  reviewOnlyPublish: boolean;
  autoMaterializePending: boolean;
  usesWorkersAi: false;
  workersAiNote: string;
  workersAi?: { cap: number; used: number; remaining: number };
}

function proposalKey(industry: string, topic: string, kind: string): string {
  return `${industry}:${topic}:${kind}`;
}

export async function estimateGrowthCycle(
  config?: LibraryGrowthConfig,
  opts?: { adminUserId?: string; adminRole?: AuthRole }
): Promise<GrowthCycleEstimate> {
  const cfg = config ?? (await loadLibraryGrowthConfig());
  const existing = await loadGrowthProposals();
  const pendingKeys = new Set(
    existing.filter((p) => p.status === 'pending').map((p) => proposalKey(p.industry, p.topic, p.kind))
  );
  const pendingInQueue = existing.filter((p) => p.status === 'pending').length;

  const planned = await planGrowthProposals(cfg);
  let proposalsWouldCreate = 0;
  let proposalsSkippedDuplicate = 0;

  for (const plan of planned) {
    const key = proposalKey(plan.industry, plan.topic, plan.kind);
    if (pendingKeys.has(key)) {
      proposalsSkippedDuplicate += 1;
      continue;
    }
    if (proposalsWouldCreate >= cfg.maxProposalsPerCycle) break;
    proposalsWouldCreate += 1;
    pendingKeys.add(key);
  }

  const unitEach = unitsPerMaterialize(cfg);
  const cycleMaterializeCap = cfg.maxUnitsPerCycle ?? cfg.maxProposalsPerCycle;
  const materializeWouldRun = cfg.autoMaterializePending
    ? Math.min(pendingInQueue + proposalsWouldCreate, cycleMaterializeCap)
    : 0;
  const unitsThisCycle = materializeWouldRun * unitEach;

  const dailyGrowthCap = cfg.maxDailyGrowthUnits ?? 20;
  const dailyGrowthUsed = await getGrowthDailyUsage();
  const dailyGrowthRemaining = Math.max(0, dailyGrowthCap - dailyGrowthUsed);
  const maxUnitsPerCycle = cycleMaterializeCap * unitEach;

  let wouldExceedBudget = false;
  let budgetMessage: string | null = null;

  if (unitsThisCycle > maxUnitsPerCycle) {
    wouldExceedBudget = true;
    budgetMessage = `This cycle would use ${unitsThisCycle} growth units (per-cycle cap ${maxUnitsPerCycle}).`;
  } else if (unitsThisCycle > dailyGrowthRemaining) {
    wouldExceedBudget = true;
    budgetMessage = `This cycle would use ${unitsThisCycle} growth units but only ${dailyGrowthRemaining} remain today (cap ${dailyGrowthCap}).`;
  }

  const estimate: GrowthCycleEstimate = {
    proposalsWouldCreate,
    proposalsSkippedDuplicate,
    pendingInQueue,
    materializeWouldRun,
    unitsPerMaterialize: unitEach,
    unitsThisCycle,
    dailyGrowthCap,
    dailyGrowthUsed,
    dailyGrowthRemaining,
    maxUnitsPerCycle,
    wouldExceedBudget,
    budgetMessage,
    reviewOnlyPublish: cfg.reviewOnlyPublish !== false,
    autoMaterializePending: Boolean(cfg.autoMaterializePending),
    usesWorkersAi: false,
    workersAiNote:
      'Library growth generates drafts with voice templates (no Workers AI). Approve in Resources to publish. Manual Generate in Resources uses Workers AI separately.',
  };

  if (opts?.adminUserId && opts?.adminRole) {
    const ai = await getUserUsageSummary(opts.adminUserId, opts.adminRole);
    estimate.workersAi = { cap: ai.cap, used: ai.used, remaining: ai.remaining };
  }

  return estimate;
}
