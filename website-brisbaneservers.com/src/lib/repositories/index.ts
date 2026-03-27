import type { ResourceRepository } from './resource-repository';
import { JsonResourceRepository } from './json-resource-repository';

let repo: ResourceRepository | null = null;
let initPromise: Promise<ResourceRepository> | null = null;

function getStorageMode(): 'json' | 'sqlite' {
  try {
    const v =
      (typeof process !== 'undefined' && process.env?.RESOURCE_STORAGE) ||
      (import.meta as unknown as { env?: { RESOURCE_STORAGE?: string } }).env?.RESOURCE_STORAGE;
    if (v === 'sqlite') return 'sqlite';
  } catch {
    /* ignore */
  }
  return 'json';
}

/**
 * Async singleton — sql.js backend needs async init when RESOURCE_STORAGE=sqlite.
 */
export async function getResourceRepository(): Promise<ResourceRepository> {
  if (repo) {
    return repo;
  }
  if (!initPromise) {
    initPromise = (async () => {
      const mode = getStorageMode();
      if (mode === 'sqlite') {
        const { SqliteResourceRepository } = await import('./sqlite-resource-repository');
        return SqliteResourceRepository.create();
      }
      return new JsonResourceRepository();
    })();
  }
  repo = await initPromise;
  return repo;
}

/** Test hook / migration scripts */
export function resetResourceRepositoryForTests(): void {
  repo = null;
  initPromise = null;
}
