/**
 * Shared in-memory resource list for dashboard, resources panel, and analytics.
 */
let workspaceResources: unknown[] = [];

export function getWorkspaceResources<T = unknown>(): T[] {
  return workspaceResources as T[];
}

export function setWorkspaceResources(resources: unknown[]): void {
  workspaceResources = Array.isArray(resources) ? resources : [];
}
