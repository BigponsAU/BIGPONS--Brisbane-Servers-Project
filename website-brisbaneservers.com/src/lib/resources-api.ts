/**
 * Shared resources API layer — paths, repository-backed load/save, slug helpers.
 * Normative types: docs/project/RESOURCE_CONTRACT.md
 */

import { getResourceRepository } from './repositories/index';
import type { Resource } from './resource-types';

export type { Resource, Visibility, ProcessingStatus } from './resource-types';
export { isPublicResource } from './resource-types';
export { RESOURCES_FILE, SEMANTIC_INDEX_FILE, SQLITE_DB_FILE } from './storage-paths';

/**
 * Ensure backing store exists (empty array / DB). Idempotent.
 */
export async function ensureResourcesFile(): Promise<void> {
  await loadResources();
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
 * Normalize topic name to slug format for consistency
 */
export function normalizeTopicSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if two topics match (handles variations in formatting)
 */
export function topicsMatch(topic1: string, topic2: string): boolean {
  const slug1 = normalizeTopicSlug(topic1);
  const slug2 = normalizeTopicSlug(topic2);
  return slug1 === slug2 || topic1.toLowerCase() === topic2.toLowerCase();
}
