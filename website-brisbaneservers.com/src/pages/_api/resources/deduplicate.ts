import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import {
  loadResources,
  saveResources,
  normalizeTopicSlug,
  topicsMatch,
  type Resource
} from '../../../lib/resources-api';

/**
 * Deduplicate resources - merge duplicates, keeping the best version
 * POST /api/resources/deduplicate
 * Requires: Admin authentication
 */
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  // Check authentication
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: 'error' in authResult && authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('[API] POST /api/resources/deduplicate - Starting deduplication');
    
    const resources = await loadResources();
    const deduplicated: Resource[] = [];
    const duplicates: Array<{ kept: string; removed: string[] }> = [];
    const seen = new Map<string, Resource>();

    for (const resource of resources) {
      const key = `${resource.industry}:${normalizeTopicSlug(resource.topic)}`;
      const existing = seen.get(key);

      if (existing) {
        // Found duplicate - keep the better one
        // Prefer: published > draft > archived, higher version, newer date, higher voice score
        let keep = existing;
        let remove = resource;

        if (resource.status === 'published' && existing.status !== 'published') {
          keep = resource;
          remove = existing;
        } else if (resource.status === existing.status) {
          if (resource.version > existing.version) {
            keep = resource;
            remove = existing;
          } else if (resource.version === existing.version) {
            const resourceDate = new Date(resource.generatedAt);
            const existingDate = new Date(existing.generatedAt);
            if (resourceDate > existingDate) {
              keep = resource;
              remove = existing;
            }
          }
        }

        // Update the map with the better resource
        seen.set(key, keep);

        // Track duplicate
        const duplicateEntry = duplicates.find(d => d.kept === keep.id);
        if (duplicateEntry) {
          duplicateEntry.removed.push(remove.id);
        } else {
          duplicates.push({
            kept: keep.id,
            removed: [remove.id]
          });
        }
      } else {
        // First occurrence - add it
        seen.set(key, resource);
      }
    }

    // Build deduplicated list
    deduplicated.push(...seen.values());

    const removedCount = resources.length - deduplicated.length;

    if (removedCount === 0) {
      const duration = Date.now() - startTime;
      console.log(`[API] POST /api/resources/deduplicate - No duplicates found (${duration}ms)`);
      
      return new Response(
        JSON.stringify({
          message: 'No duplicates found. All resources are unique.',
          duplicatesFound: 0,
          resourcesRemoved: 0,
          totalResources: resources.length,
          success: true
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Save deduplicated resources
    await saveResources(deduplicated);

    const duration = Date.now() - startTime;
    console.log(`[API] POST /api/resources/deduplicate - Removed ${removedCount} duplicates (${duration}ms)`);
    
    return new Response(
      JSON.stringify({
        message: `Successfully removed ${removedCount} duplicate resource(s)`,
        duplicatesFound: duplicates.length,
        resourcesRemoved: removedCount,
        totalResources: deduplicated.length,
        duplicates: duplicates.map(d => ({
          kept: d.kept,
          removed: d.removed,
          count: d.removed.length
        })),
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] POST /api/resources/deduplicate - Error after ${duration}ms:`, error);
    
    return new Response(
      JSON.stringify({
        error: message,
        code: 'INTERNAL_ERROR',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
