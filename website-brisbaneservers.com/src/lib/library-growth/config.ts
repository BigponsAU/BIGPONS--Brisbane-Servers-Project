import { promises as fs } from 'fs';
import * as path from 'path';
import { voiceFrameworkStorageDir } from '../monorepo-root';
import { defaultLibraryGrowthConfig, type LibraryGrowthConfig } from './types';

function configFilePath(): string {
  return path.join(voiceFrameworkStorageDir(), 'library-growth-config.json');
}

async function ensureConfigFile(): Promise<void> {
  const file = configFilePath();
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(defaultLibraryGrowthConfig, null, 2));
  }
}

export async function loadLibraryGrowthConfig(): Promise<LibraryGrowthConfig> {
  await ensureConfigFile();
  try {
    const raw = JSON.parse(await fs.readFile(configFilePath(), 'utf-8')) as Partial<LibraryGrowthConfig>;
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
  } catch {
    return { ...defaultLibraryGrowthConfig };
  }
}

export async function saveLibraryGrowthConfig(config: LibraryGrowthConfig): Promise<void> {
  await ensureConfigFile();
  await fs.writeFile(configFilePath(), JSON.stringify(config, null, 2));
}

export function computeNextCycleAt(config: LibraryGrowthConfig, from = new Date()): string | null {
  if (!config.enabled || !config.scheduleArmed || config.intervalHours <= 0) return null;
  const next = new Date(from.getTime() + config.intervalHours * 60 * 60 * 1000);
  return next.toISOString();
}
