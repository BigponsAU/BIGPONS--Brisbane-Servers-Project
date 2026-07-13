/**
 * Contribution token awards — earned on acceptance only (auto-accept or admin approve).
 * Reject claws back any ledger net for that contribution (covers legacy upload-time grants).
 */
import {
  addLedgerEntry,
  loadLedger,
} from './token-ledger';
import type { Contribution } from './contributions';
import { loadPipelineConfig } from './pipeline-config';
import {
  computeContributionTokenAward,
  hasInitialContributionAward,
  sumContributionDeltas,
} from './contribution-token-math';

export {
  computeContributionTokenAward,
  hasInitialContributionAward,
  sumContributionDeltas,
} from './contribution-token-math';

export async function getContributionLedgerNet(contributionId: string): Promise<number> {
  const entries = await loadLedger();
  return sumContributionDeltas(entries, contributionId);
}

/**
 * Idempotent initial award for an accepted contribution.
 * Optional tokenDelta is an additional moderation_adjustment (can be negative).
 */
export async function awardTokensOnAccept(
  contribution: Contribution,
  options?: { tokenDelta?: number; tokenMultiplier?: number },
): Promise<{ awarded: number; adjustment: number; tokensAwarded: number }> {
  const config = await loadPipelineConfig();
  const multiplier = options?.tokenMultiplier ?? config.tokenMultiplier;
  const entries = await loadLedger();
  let awarded = 0;

  if (!hasInitialContributionAward(entries, contribution.id)) {
    const amount = computeContributionTokenAward(
      contribution.analysis?.voiceScore,
      multiplier,
    );
    if (amount > 0) {
      await addLedgerEntry({
        userId: contribution.userId,
        delta: amount,
        reason: 'initial_contribution',
        resourceId: contribution.resourceId,
        contributionId: contribution.id,
      });
      awarded = amount;
    }
  }

  let adjustment = 0;
  const tokenDelta = options?.tokenDelta;
  if (typeof tokenDelta === 'number' && tokenDelta !== 0) {
    await addLedgerEntry({
      userId: contribution.userId,
      delta: tokenDelta,
      reason: tokenDelta > 0 ? 'moderation_adjustment' : 'admin_revoke',
      resourceId: contribution.resourceId,
      contributionId: contribution.id,
    });
    adjustment = tokenDelta;
  }

  const tokensAwarded = Math.max(0, await getContributionLedgerNet(contribution.id));
  return { awarded, adjustment, tokensAwarded };
}

/**
 * Claw back net positive balance tied to this contribution.
 * Optional tokenDelta overrides with an explicit adjustment instead of full clawback.
 */
export async function revokeTokensOnReject(
  contribution: Contribution,
  options?: { tokenDelta?: number },
): Promise<{ clawedBack: number; tokensAwarded: number }> {
  if (typeof options?.tokenDelta === 'number' && options.tokenDelta !== 0) {
    await addLedgerEntry({
      userId: contribution.userId,
      delta: options.tokenDelta,
      reason: options.tokenDelta > 0 ? 'moderation_adjustment' : 'admin_revoke',
      resourceId: contribution.resourceId,
      contributionId: contribution.id,
    });
    const net = await getContributionLedgerNet(contribution.id);
    return { clawedBack: options.tokenDelta < 0 ? -options.tokenDelta : 0, tokensAwarded: Math.max(0, net) };
  }

  const net = await getContributionLedgerNet(contribution.id);
  if (net <= 0) {
    return { clawedBack: 0, tokensAwarded: 0 };
  }

  await addLedgerEntry({
    userId: contribution.userId,
    delta: -net,
    reason: 'admin_revoke',
    resourceId: contribution.resourceId,
    contributionId: contribution.id,
  });

  return { clawedBack: net, tokensAwarded: 0 };
}
