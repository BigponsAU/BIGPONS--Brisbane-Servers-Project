import type { APIRoute } from 'astro';
import {
  loadResources,
  isPublicResource,
  normalizeTopicSlug
} from '../../../lib/resources-api';
import { loadContributions } from '../../../lib/contributions';

/**
 * Public community view for a specific industry/topic.
 * GET /api/community/by-topic?industry=...&topic=...
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const industry = url.searchParams.get('industry');
    const topic = url.searchParams.get('topic');

    if (!industry || !topic) {
      return new Response(
        JSON.stringify({
          error: 'Industry and topic are required',
          code: 'MISSING_FIELDS',
          success: false
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const [resources, contributions] = await Promise.all([
      loadResources(),
      loadContributions()
    ]);

    const topicSlug = normalizeTopicSlug(topic);

    const items = contributions
      .filter(
        (c) =>
          c.payload.industry === industry &&
          normalizeTopicSlug(c.payload.topic) === topicSlug &&
          c.status !== 'rejected'
      )
      .map((c) => {
        const resource = resources.find(
          (r) => r.id === c.resourceId && isPublicResource(r)
        );
        if (!resource) return null;
        return { contribution: c, resource };
      })
      .filter((x) => x !== null);

    return new Response(
      JSON.stringify({
        items,
        count: items.length,
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
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

