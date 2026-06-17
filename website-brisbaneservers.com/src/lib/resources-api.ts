/**
 * Shared resources API layer — paths, repository-backed load/save, slug helpers.
 * Normative types: docs/project/RESOURCE_CONTRACT.md
 */

import { getResourceRepository } from './repositories/index';
import type { Resource } from './resource-types';
import { normalizeTopicSlug } from './resource-slug';

export type { Resource, Visibility, ProcessingStatus } from './resource-types';
export { isPublicResource } from './resource-types';
export { normalizeTopicSlug } from './resource-slug';
export {
  getResourcesFile,
  getSemanticIndexFile,
} from './storage-paths';

/**
 * Ensure backing store exists (empty array / DB). Idempotent.
 */
export async function ensureResourcesFile(): Promise<void> {
  const repo = await getResourceRepository();
  await repo.loadAll();
}

export async function loadResources(): Promise<Resource[]> {
  const repo = await getResourceRepository();
  return repo.loadAll();
}

export async function saveResources(resources: Resource[]): Promise<void> {
  const repo = await getResourceRepository();
  await repo.saveAll(resources);
}

/**
 * Check if two topics match (handles variations in formatting)
 */
export function topicsMatch(topic1: string, topic2: string): boolean {
  const slug1 = normalizeTopicSlug(topic1);
  const slug2 = normalizeTopicSlug(topic2);
  return slug1 === slug2 || topic1.toLowerCase() === topic2.toLowerCase();
}
