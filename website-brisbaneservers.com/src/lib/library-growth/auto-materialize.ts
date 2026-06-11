import { schedulePublicSurfaceUpdate } from '../deploy-rebuild';
import { loadLibraryGrowthConfig } from './config';
import {
  checkGrowthBudget,
  recordGrowthUsage,
  unitsPerMaterialize,
} from './growth-usage-budget';
import { materializeGrowthProposal } from './materialize';
import { loadGrowthProposals, updateGrowthProposalStatus } from './proposals-store';

export const LIBRARY_GROWTH_SYSTEM_ACTOR = 'library-growth@brisbaneservers.com';

export interface AutoMaterializeResult {
  attempted: number;
  materialized: number;
  published: number;
  failed: number;
  skippedBudget: number;
  budgetBlocked: boolean;
  budgetReason?: string;
  errors: string[];
}

/** Generate draft resources from pending proposals (website grows itself when enabled). */
export async function autoMaterializePendingProposals(limit?: number): Promise<AutoMaterializeResult> {
  const config = await loadLibraryGrowthConfig();
  const empty: AutoMaterializeResult = {
    attempted: 0,
    materialized: 0,
    published: 0,
    failed: 0,
    skippedBudget: 0,
    budgetBlocked: false,
    errors: [],
  };

  if (!config.autoMaterializePending) {
    return empty;
  }

  const max = limit ?? config.maxUnitsPerCycle ?? config.maxProposalsPerCycle;
  const pending = (await loadGrowthProposals()).filter((p) => p.status === 'pending').slice(0, max);
  const unitEach = unitsPerMaterialize(config);

  const result: AutoMaterializeResult = {
    attempted: pending.length,
    materialized: 0,
    published: 0,
    failed: 0,
    skippedBudget: 0,
    budgetBlocked: false,
    errors: [],
  };

  if (pending.length === 0) {
    return result;
  }

  const preflight = await checkGrowthBudget(config, pending.length * unitEach);
  if (!preflight.ok) {
    result.budgetBlocked = true;
    result.budgetReason = preflight.reason;
    result.skippedBudget = pending.length;
    result.errors.push(preflight.reason);
    return result;
  }

  let surfaceUpdates = 0;

  for (const proposal of pending) {
    const slot = await checkGrowthBudget(config, unitEach);
    if (!slot.ok) {
      result.skippedBudget += 1;
      result.budgetReason = slot.reason;
      break;
    }

    try {
      const { resource, voiceScore, published } = await materializeGrowthProposal(
        proposal,
        LIBRARY_GROWTH_SYSTEM_ACTOR
      );
      await recordGrowthUsage(unitEach, 'materialize', proposal.id);
      await updateGrowthProposalStatus(proposal.id, 'materialized', {
        reviewedBy: LIBRARY_GROWTH_SYSTEM_ACTOR,
        resourceId: resource.id,
        estimatedVoiceScore: voiceScore,
      });
      result.materialized += 1;
      if (published) {
        result.published += 1;
        const before = { ...resource, status: 'draft' as const };
        schedulePublicSurfaceUpdate(before, resource, `library-growth-${proposal.id}`);
        surfaceUpdates += 1;
      }
    } catch (error) {
      result.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`${proposal.id}: ${message}`);
    }
  }

  if (surfaceUpdates > 0) {
    console.info(`[library-growth] Scheduled ${surfaceUpdates} public surface update(s)`);
  }

  return result;
}
