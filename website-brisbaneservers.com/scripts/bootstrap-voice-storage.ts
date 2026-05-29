#!/usr/bin/env npx tsx
/**
 * Ensure voice-framework/storage exists on the API host with seed corpus from git.
 * Run before start:api on Render (ephemeral or fresh disk).
 *
 * - Copies tracked seed JSON from repo when target files are missing.
 * - Never overwrites existing production data (disk-backed corpus safe).
 */
import { copyFile, mkdir, access } from 'fs/promises';
import * as path from 'path';
import { getMonorepoRoot, voiceFrameworkStorageDir } from '../src/lib/monorepo-root';

const SEED_FILES = [
  'resources.json',
  'profiles.json',
  'text-storage.json',
  'vector-storage.json',
] as const;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const root = getMonorepoRoot();
  const storageDir = voiceFrameworkStorageDir();
  const seedDir = path.join(root, 'voice-framework', 'storage');

  await mkdir(storageDir, { recursive: true });

  let copied = 0;
  let skipped = 0;

  for (const name of SEED_FILES) {
    const target = path.join(storageDir, name);
    const seed = path.join(seedDir, name);
    if (await fileExists(target)) {
      skipped += 1;
      continue;
    }
    if (!(await fileExists(seed))) {
      continue;
    }
    await copyFile(seed, target);
    copied += 1;
    console.log(`[bootstrap-storage] seeded ${name}`);
  }

  // Empty optional runtime files (created on first use if absent)
  const optionalEmpty: Record<string, unknown> = {
    'library-growth-config.json': {
      enabled: false,
      scheduleArmed: false,
      scheduleArmedAt: null,
      scheduleArmedBy: null,
      intervalHours: 168,
      maxProposalsPerCycle: 5,
      generateCaseStudies: true,
      autoPublishMinScore: null,
      lastCycleAt: null,
      nextCycleAt: null,
    },
    'growth-proposals.json': [],
    'semantic-index.json': { version: 1, chunks: [] },
    'case-study-drafts.json': [],
  };

  for (const [name, defaultValue] of Object.entries(optionalEmpty)) {
    const target = path.join(storageDir, name);
    if (await fileExists(target)) {
      skipped += 1;
      continue;
    }
    const { writeFile } = await import('fs/promises');
    await writeFile(target, `${JSON.stringify(defaultValue, null, 2)}\n`, 'utf-8');
    copied += 1;
    console.log(`[bootstrap-storage] initialized ${name}`);
  }

  console.log(
    `[bootstrap-storage] storage=${storageDir} copied=${copied} skipped=${skipped} (existing files preserved)`
  );
}

main().catch((error) => {
  console.error('[bootstrap-storage] failed:', error);
  process.exit(1);
});
