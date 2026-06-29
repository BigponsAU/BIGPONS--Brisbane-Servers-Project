import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import {
  loadResources,
  normalizeTopicSlug,
  type Resource
} from '../../../lib/resources-api';
import { filterResourcesForUser } from '../../../lib/resource-access';

/**
 * Get all resources
 * GET /api/resources
 * Query: industry, topic, status
 * Filtered by role: super-admin/admin see all; editor/viewer see starter + own.
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({
        error: authResult.error,
        code: authResult.code,
        success: false
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const url = new URL(request.url);
    const industry = url.searchParams.get('industry');
    const topic = url.searchParams.get('topic');
    const status = url.searchParams.get('status');
    const includeRemoved = url.searchParams.get('includeRemoved') === '1';
    const removedOnly = url.searchParams.get('removedOnly') === '1';
    const isAdmin =
      authResult.user.role === 'admin' || authResult.user.role === 'super-admin';

    if ((includeRemoved || removedOnly) && !isAdmin) {
      return new Response(
        JSON.stringify({
          error: 'Admin only',
          code: 'FORBIDDEN',
          success: false,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    let resources = await loadResources();
    resources = filterResourcesForUser(authResult.user, resources, {
      includeRemoved,
      removedOnly,
    });

    // Query filters
    if (industry) {
      resources = resources.filter((r) => r.industry === industry);
    }
    if (topic) {
      const topicSlug = normalizeTopicSlug(topic);
      resources = resources.filter((r) => {
        const rTopicSlug = normalizeTopicSlug(r.topic);
        return r.topic === topic || r.topic === topicSlug || rTopicSlug === topicSlug;
      });
    }
    if (status) {
      resources = resources.filter((r) => r.status === status);
    }

    return new Response(
      JSON.stringify({
        resources,
        count: resources.length,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Error in GET /api/resources:', error);
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
