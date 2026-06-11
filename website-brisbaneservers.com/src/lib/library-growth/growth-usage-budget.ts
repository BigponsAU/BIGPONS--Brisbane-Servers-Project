/**
 * Site-wide growth budget (template materialize + indexing — not Workers AI neurons).
 * Prevents one cycle from exhausting the daily growth allowance.
 */

import * as path from 'path';
import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from '../corpus-store';
import { voiceFrameworkStorageDir } from '../monorepo-root';
import type { LibraryGrowthConfig } from './types';

export interface GrowthUsageEntry {
  id: string;
  units: number;
  reason: 'materialize' | 'cycle-plan';
  proposalId?: string;
  createdAt: string;
}

function growthUsageFile(): string {
  return path.join(voiceFrameworkStorageDir(), 'growth-usage-ledger.json');
}

function utcDayKey(iso = new Date().toISOString()): string {
  return iso.slice(0, 10);
}

export async function loadGrowthUsageEntries(): Promise<GrowthUsageEntry[]> {
  const entries = await readCorpusJson<GrowthUsageEntry[]>(
    CORPUS_DOC_KEYS.GROWTH_USAGE_LEDGER,
    growthUsageFile(),
    []
  );
  return Array.isArray(entries) ? entries : [];
}

async function saveGrowthUsageEntries(entries: GrowthUsageEntry[]): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.GROWTH_USAGE_LEDGER, growthUsageFile(), entries);
}

export async function getGrowthDailyUsage(day = utcDayKey()): Promise<number> {
  const entries = await loadGrowthUsageEntries();
  return entries
    .filter((e) => utcDayKey(e.createdAt) === day)
    .reduce((sum, e) => sum + e.units, 0);
}

export function unitsPerMaterialize(config: LibraryGrowthConfig): number {
  return Math.max(1, config.unitsPerMaterialize ?? 1);
}

export async function checkGrowthBudget(
  config: LibraryGrowthConfig,
  unitsNeeded: number
): Promise<
  | { ok: true; dailyUsed: number; dailyCap: number; remaining: number; cycleCap: number }
  | { ok: false; reason: string; dailyUsed: number; dailyCap: number; remaining: number; cycleCap: number }
> {
  const dailyCap = config.maxDailyGrowthUnits ?? 20;
  const cycleCap = config.maxUnitsPerCycle ?? config.maxProposalsPerCycle ?? 5;
  const unitEach = unitsPerMaterialize(config);
  const maxCycleUnits = cycleCap * unitEach;
  const dailyUsed = await getGrowthDailyUsage();
  const remaining = Math.max(0, dailyCap - dailyUsed);

  if (unitsNeeded > maxCycleUnits) {
    return {
      ok: false,
      reason: `Cycle would need ${unitsNeeded} growth units (per-cycle cap ${maxCycleUnits}).`,
      dailyUsed,
      dailyCap,
      remaining,
      cycleCap: maxCycleUnits,
    };
  }

  if (unitsNeeded > remaining) {
    return {
      ok: false,
      reason: `Not enough daily growth budget (${remaining} left of ${dailyCap}; need ${unitsNeeded}).`,
      dailyUsed,
      dailyCap,
      remaining,
      cycleCap: maxCycleUnits,
    };
  }

  return { ok: true, dailyUsed, dailyCap, remaining, cycleCap: maxCycleUnits };
}

export async function recordGrowthUsage(
  units: number,
  reason: GrowthUsageEntry['reason'],
  proposalId?: string
): Promise<void> {
  const entries = await loadGrowthUsageEntries();
  entries.push({
    id: `growth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    units,
    reason,
    proposalId,
    createdAt: new Date().toISOString(),
  });
  await saveGrowthUsageEntries(entries);
}
