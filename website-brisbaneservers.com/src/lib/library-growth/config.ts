import * as path from 'path';
import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from '../corpus-store';
import { voiceFrameworkStorageDir } from '../monorepo-root';
import { defaultLibraryGrowthConfig, type LibraryGrowthConfig } from './types';

function configFilePath(): string {
  return path.join(voiceFrameworkStorageDir(), 'library-growth-config.json');
}

export async function loadLibraryGrowthConfig(): Promise<LibraryGrowthConfig> {
  const raw = await readCorpusJson<Partial<LibraryGrowthConfig>>(
    CORPUS_DOC_KEYS.LIBRARY_GROWTH_CONFIG,
    configFilePath(),
    defaultLibraryGrowthConfig
  );
  return {
    ...defaultLibraryGrowthConfig,
    ...raw,
    enabled: Boolean(raw.enabled),
    scheduleArmed: Boolean(raw.scheduleArmed),
    scheduleArmedAt: raw.scheduleArmedAt ?? null,
    scheduleArmedBy: raw.scheduleArmedBy ?? null,
    intervalHours:
      typeof raw.intervalHours === 'number' && raw.intervalHours >= 0
        ? raw.intervalHours
        : defaultLibraryGrowthConfig.intervalHours,
    maxProposalsPerCycle:
      typeof raw.maxProposalsPerCycle === 'number' && raw.maxProposalsPerCycle > 0
        ? Math.min(raw.maxProposalsPerCycle, 20)
        : defaultLibraryGrowthConfig.maxProposalsPerCycle,
    generateCaseStudies: raw.generateCaseStudies !== false,
    autoPublishMinScore:
      typeof raw.autoPublishMinScore === 'number' ? raw.autoPublishMinScore : null,
    lastCycleAt: raw.lastCycleAt ?? null,
    nextCycleAt: raw.nextCycleAt ?? null,
  };
}

export async function saveLibraryGrowthConfig(config: LibraryGrowthConfig): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.LIBRARY_GROWTH_CONFIG, configFilePath(), config);
}

export function computeNextCycleAt(config: LibraryGrowthConfig): string | null {
  if (!config.enabled || !config.scheduleArmed || config.intervalHours <= 0) {
    return null;
  }
  const base = config.lastCycleAt ? new Date(config.lastCycleAt) : new Date();
  return new Date(base.getTime() + config.intervalHours * 60 * 60 * 1000).toISOString();
}
