/**
 * Aggregate resource stats per voice profile for dashboard profile cards.
 */

import type { Resource } from './resource-types';

export interface ProfileCardStats {
  linkedResourceCount: number;
  avgVoiceScore: number | null;
  corpusResourceCount: number;
  corpusIndexedCount: number;
}

export type ProfileStatsInput = {
  id: string;
  corpusResourceIds?: string[];
  corpusResourceCount?: number;
  corpusIndexedCount?: number;
};

export function computeProfileCardStats(
  profile: ProfileStatsInput,
  resources: Resource[]
): ProfileCardStats {
  const linked = resources.filter((r) => r.metadata?.voiceProfileId === profile.id);
  const scores = linked
    .map((r) => r.metadata?.voiceScore)
    .filter((s): s is number => typeof s === 'number' && !Number.isNaN(s));

  const corpusIds = profile.corpusResourceIds ?? [];
  const corpusResourceCount = profile.corpusResourceCount ?? corpusIds.length;
  const corpusIndexedCount =
    profile.corpusIndexedCount ??
    corpusIds.filter((id) => {
      const r = resources.find((res) => res.id === id);
      return r?.chunkIds && r.chunkIds.length > 0;
    }).length;

  return {
    linkedResourceCount: linked.length,
    avgVoiceScore:
      scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null,
    corpusResourceCount,
    corpusIndexedCount,
  };
}
