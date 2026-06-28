/**
 * Read voice-framework/storage/resources.json during Astro static builds.
 * Pages CI has no DATABASE_URL — corpus is exported in prebuild when PAGES_BUILD_EXPORT_ON_BUILD=1.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { Resource } from './resource-types';
import { getResourcesFile } from './storage-paths';

function resolveGitCorpusFile(): string {
  const storageOverride = process.env.VOICE_STORAGE_DIR?.trim();
  if (storageOverride) {
    return path.join(path.resolve(storageOverride), 'resources.json');
  }

  const monorepoRoot = process.env.MONOREPO_ROOT?.trim();
  if (monorepoRoot) {
    return path.join(path.resolve(monorepoRoot), 'voice-framework', 'storage', 'resources.json');
  }

  const fromCwd = path.resolve(process.cwd(), '..', 'voice-framework', 'storage', 'resources.json');
  if (existsSync(fromCwd)) {
    return fromCwd;
  }

  return getResourcesFile();
}

export async function loadGitCorpusResources(): Promise<Resource[]> {
  try {
    const raw = await readFile(resolveGitCorpusFile(), 'utf-8');
    const parsed = JSON.parse(raw) as Resource[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
