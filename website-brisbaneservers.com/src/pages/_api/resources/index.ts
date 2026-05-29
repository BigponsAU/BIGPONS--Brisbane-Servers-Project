import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import {
  loadResources,
  normalizeTopicSlug,
  type Resource
} from '../../../lib/resources-api';

/**
 * Get all resources
 * GET /api/resources
 * Query: industry, topic, status, includeStarterBlocks
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

    let resources = await loadResources();

    // Filter by access: super-admin/admin see all; editor/viewer see starter + own (or legacy no ownerId)
    const user = authResult.user;
    const canSeeAll = user.role === 'super-admin' || user.role === 'admin';
    if (!canSeeAll) {
      resources = resources.filter(
        (r) =>
          r.isStarterBlock === true ||
          r.ownerId === user.id ||
          !r.ownerId
      );
    }

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
