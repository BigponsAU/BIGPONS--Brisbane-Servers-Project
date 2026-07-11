/**
 * Shared in-memory resource list for dashboard, resources panel, and analytics.
 *
 * `workspaceResources` is the latest list snapshot (may be status/type filtered).
 * `workspaceResourceById` is a durable lookup index: filtered reloads update it
 * but do not wipe entries, so detail-panel actions still resolve after a filter
 * change leaves a previously selected resource off the current list.
 */
import { ingestResourcesIntoMarkov } from './portal-markov-tracker';

let workspaceResources: unknown[] = [];
const workspaceResourceById = new Map<string, unknown>();

function resourceIdOf(resource: unknown): string | null {
  if (!resource || typeof resource !== 'object') return null;
  const id = (resource as { id?: unknown }).id;
  return typeof id === 'string' && id ? id : null;
}

function indexResource(resource: unknown): void {
  const id = resourceIdOf(resource);
  if (!id) return;
  workspaceResourceById.set(id, resource);
}

function syncMarkovFromResources(resources: unknown[]): void {
  try {
    ingestResourcesIntoMarkov(
      resources as Array<{
        id: string;
        title?: string;
        isStarterBlock?: boolean;
        metadata?: {
          sourceResourceId?: string;
          sourceResourceIds?: string[];
          sourceKind?:
            | 'starter'
            | 'resource'
            | 'generate'
            | 'improve'
            | 'upload'
            | 'growth'
            | 'rag';
          voiceProfileId?: string;
          voiceScore?: number;
        };
      }>
    );
  } catch {
    /* ignore markov hydrate failures */
  }
}

export function getWorkspaceResources<T = unknown>(): T[] {
  return workspaceResources as T[];
}

export function setWorkspaceResources(resources: unknown[]): void {
  workspaceResources = Array.isArray(resources) ? resources : [];
  for (const resource of workspaceResources) {
    indexResource(resource);
  }
  syncMarkovFromResources(workspaceResources);
}

/** Insert or replace one resource in both the list snapshot and the durable index. */
export function upsertWorkspaceResource(resource: unknown): void {
  const id = resourceIdOf(resource);
  if (!id) return;
  indexResource(resource);
  const idx = workspaceResources.findIndex((r) => resourceIdOf(r) === id);
  if (idx >= 0) {
    workspaceResources[idx] = resource;
  } else {
    workspaceResources = [...workspaceResources, resource];
  }
  syncMarkovFromResources([resource]);
}

export function removeWorkspaceResource(id: string): void {
  if (!id) return;
  workspaceResourceById.delete(id);
  workspaceResources = workspaceResources.filter((r) => resourceIdOf(r) !== id);
}

export function getWorkspaceResourceById<T = unknown>(id: string): T | undefined {
  if (!id) return undefined;
  const indexed = workspaceResourceById.get(id);
  if (indexed) return indexed as T;
  return workspaceResources.find((r) => resourceIdOf(r) === id) as T | undefined;
}

export function clearWorkspaceResources(): void {
  workspaceResources = [];
  workspaceResourceById.clear();
}
