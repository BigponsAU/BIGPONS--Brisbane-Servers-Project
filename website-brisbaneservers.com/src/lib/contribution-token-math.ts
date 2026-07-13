import type { TokenLedgerEntry } from './token-ledger';

export function computeContributionTokenAward(
  voiceScore: number | undefined,
  tokenMultiplier: number,
): number {
  return Math.round(Math.max(0, voiceScore ?? 0) * tokenMultiplier);
}

export function sumContributionDeltas(
  entries: TokenLedgerEntry[],
  contributionId: string,
): number {
  return entries
    .filter((e) => e.contributionId === contributionId)
    .reduce((sum, e) => sum + e.delta, 0);
}

export function hasInitialContributionAward(
  entries: TokenLedgerEntry[],
  contributionId: string,
): boolean {
  return entries.some(
    (e) =>
      e.contributionId === contributionId &&
      e.reason === 'initial_contribution' &&
      e.delta > 0,
  );
}
