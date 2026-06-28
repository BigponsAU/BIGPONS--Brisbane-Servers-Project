/**
 * Read voice-framework/storage/resources.json during Astro static builds.
 * Pages CI has no DATABASE_URL — corpus is exported in prebuild when PAGES_BUILD_EXPORT_ON_BUILD=1.
 */
import { readFile } from 'node:fs/promises';
import type { Resource } from './resource-types';
import { getResourcesFile } from './storage-paths';

export async function loadGitCorpusResources(): Promise<Resource[]> {
  try {
    const raw = await readFile(getResourcesFile(), 'utf-8');
    const parsed = JSON.parse(raw) as Resource[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
