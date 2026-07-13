import { describe, expect, it } from 'vitest';
import type { TopicCoverageRow } from '../src/lib/analytics';

/** Mirror of coverageStatus in analytics.ts — keep in sync for pure unit checks. */
function coverageStatus(published: number): 'gap' | 'sparse' | 'covered' {
  if (published <= 0) return 'gap';
  if (published < 2) return 'sparse';
  return 'covered';
}

function coveragePercent(topics: Pick<TopicCoverageRow, 'status'>[]): number {
  const totalSlots = topics.length;
  if (totalSlots === 0) return 0;
  const sparse = topics.filter((t) => t.status === 'sparse').length;
  const covered = topics.filter((t) => t.status === 'covered').length;
  return Math.round(((sparse * 0.5 + covered) / totalSlots) * 100);
}

describe('corpus analytics coverage helpers', () => {
  it('classifies published counts into gap/sparse/covered', () => {
    expect(coverageStatus(0)).toBe('gap');
    expect(coverageStatus(1)).toBe('sparse');
    expect(coverageStatus(2)).toBe('covered');
    expect(coverageStatus(5)).toBe('covered');
  });

  it('weights sparse slots at half coverage', () => {
    expect(
      coveragePercent([
        { status: 'covered' },
        { status: 'sparse' },
        { status: 'gap' },
        { status: 'gap' },
      ])
    ).toBe(38);
  });
});
