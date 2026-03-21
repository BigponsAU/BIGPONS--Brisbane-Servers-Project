import type { APIRoute } from 'astro';
import { requireAuth } from '../../../utils/auth';
import {
  ensureResourcesFile,
  loadResources
} from '../../../lib/resources-api';

/**
 * Get starter blocks only
 * GET /api/resources/starter-blocks
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

    await ensureResourcesFile();
    let resources = await loadResources();

    resources = resources.filter((r) => r.isStarterBlock === true);

    if (industry) {
      resources = resources.filter((r) => r.industry === industry);
    }
    if (topic) {
      resources = resources.filter((r) => r.topic === topic);
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
    console.error('[API] Error in GET /api/resources/starter-blocks:', error);
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
