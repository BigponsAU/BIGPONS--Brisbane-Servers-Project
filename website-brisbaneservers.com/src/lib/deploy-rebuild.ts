/**
 * @deprecated Prefer schedulePublicSurfaceUpdate from publish-public-surfaces.ts
 */
import type { Resource } from './resource-types';
import { shouldUpdatePublicSurfaces } from './content-plane';
import { schedulePublicSurfaceUpdate } from './publish-public-surfaces';

export type RebuildRequestResult = {
  triggered: boolean;
  skippedReason?: string;
  error?: string;
};

/** @deprecated Use shouldUpdatePublicSurfaces from content-plane.ts */
export function shouldRebuildForResourceChange(before: Resource, after: Resource): boolean {
  return shouldUpdatePublicSurfaces(before, after);
}

/** @deprecated Full-site deploy disabled by default; use schedulePublicSurfaceUpdate */
export function scheduleStaticSiteRebuild(reason: string): void {
  console.warn(
    `[deploy-rebuild] scheduleStaticSiteRebuild("${reason}") ignored — use schedulePublicSurfaceUpdate(before, after, reason)`,
  );
}

export async function requestStaticSiteRebuild(_reason: string): Promise<RebuildRequestResult> {
  return {
    triggered: false,
    skippedReason: 'Full-site deploy hook disabled; resource pages use live SSR + cache purge on publish',
  };
}

export { schedulePublicSurfaceUpdate };
