import type { APIRoute } from 'astro';
import {
  loadResources,
  normalizeTopicSlug,
  isPublicResource
} from '../../../lib/resources-api';

/**
 * Get public resources (published only, no auth required)
 * GET /api/resources/public
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const industry = url.searchParams.get('industry');
    const topic = url.searchParams.get('topic');
    const id = url.searchParams.get('id');
    
    let resources = await loadResources();

    // Filter only resources that are safe for public exposure
    resources = resources.filter(isPublicResource);

    // Filter by ID if provided (returns single resource)
    if (id) {
      const resource = resources.find(r => r.id === id && isPublicResource(r));
      if (!resource) {
        return new Response(
          JSON.stringify({
            error: 'Resource not found',
            code: 'NOT_FOUND',
            success: false
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return new Response(
        JSON.stringify({
          resource,
          success: true
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
          }
        }
      );
    }

    // Filter by industry and topic if provided (normalize topic for matching)
    if (industry) {
      resources = resources.filter(r => r.industry === industry);
    }
    if (topic) {
      const topicSlug = normalizeTopicSlug(topic);
      resources = resources.filter(r => {
        const rTopicSlug = normalizeTopicSlug(r.topic);
        return r.topic === topic || r.topic === topicSlug || rTopicSlug === topicSlug;
      });
    }

    return new Response(
      JSON.stringify({
        resources,
        count: resources.length,
        success: true
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
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
