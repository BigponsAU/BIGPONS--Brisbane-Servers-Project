import { describe, expect, it } from 'vitest';
import {
  computeContributionTokenAward,
  hasInitialContributionAward,
  sumContributionDeltas,
} from '../src/lib/contribution-token-math';
import type { TokenLedgerEntry } from '../src/lib/token-ledger';

describe('contribution token helpers', () => {
  it('computes award from voice score × multiplier', () => {
    expect(computeContributionTokenAward(0.75, 10)).toBe(8);
    expect(computeContributionTokenAward(0, 10)).toBe(0);
    expect(computeContributionTokenAward(undefined, 10)).toBe(0);
    expect(computeContributionTokenAward(1.2, 10)).toBe(12);
  });

  it('sums and detects initial awards by contribution id', () => {
    const entries: TokenLedgerEntry[] = [
      {
        id: 'a',
        userId: 'u1',
        delta: 8,
        reason: 'initial_contribution',
        contributionId: 'c1',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b',
        userId: 'u1',
        delta: -3,
        reason: 'admin_revoke',
        contributionId: 'c1',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'c',
        userId: 'u1',
        delta: 5,
        reason: 'initial_contribution',
        contributionId: 'c2',
        createdAt: '2026-01-03T00:00:00.000Z',
      },
    ];

    expect(sumContributionDeltas(entries, 'c1')).toBe(5);
    expect(sumContributionDeltas(entries, 'c2')).toBe(5);
    expect(sumContributionDeltas(entries, 'missing')).toBe(0);
    expect(hasInitialContributionAward(entries, 'c1')).toBe(true);
    expect(hasInitialContributionAward(entries, 'missing')).toBe(false);
  });
});
