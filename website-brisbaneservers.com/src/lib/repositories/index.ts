import type { ResourceRepository } from './resource-repository';
import { usePostgres } from '../db/pg-pool';

let repo: ResourceRepository | null = null;
let initPromise: Promise<ResourceRepository> | null = null;

/**
 * Resource store — Postgres corpus only (production).
 */
export async function getResourceRepository(): Promise<ResourceRepository> {
  if (repo) {
    return repo;
  }
  if (!initPromise) {
    initPromise = (async () => {
      if (!usePostgres()) {
        throw new Error('DATABASE_URL is required for resource storage');
      }
      const { PgResourceRepository } = await import('./pg-resource-repository');
      return new PgResourceRepository();
    })();
  }
  repo = await initPromise;
  return repo;
}

/** Test hook */
export function resetResourceRepositoryForTests(): void {
  repo = null;
  initPromise = null;
}
