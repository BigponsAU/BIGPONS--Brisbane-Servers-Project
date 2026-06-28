import type { APIRoute } from 'astro';
import { checkRateLimit, getClientKey } from '../../../lib/rate-limit';
import { searchPublicResources } from '../../../lib/search/public-resource-search';

const MAX_REQ_PER_MIN = 60;
const MIN_QUERY_LEN = 3;

/**
 * Public hybrid search (semantic RAG + proposition keywords). Published resources only.
 * GET /api/resources/search?q=...&limit=8
 */
export const GET: APIRoute = async ({ request }) => {
  const key = `resource-search:${getClientKey(request)}`;
  const rl = checkRateLimit(key, MAX_REQ_PER_MIN, 60_000);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT', success: false }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      }
    );
  }

  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const limit = Math.min(12, Math.max(1, parseInt(url.searchParams.get('limit') || '8', 10) || 8));

    if (q.length < MIN_QUERY_LEN) {
      return new Response(
        JSON.stringify({
          error: `q must be at least ${MIN_QUERY_LEN} characters`,
          code: 'MISSING_FIELDS',
          success: false,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = await searchPublicResources(q, limit);

    return new Response(
      JSON.stringify({
        success: true,
        query: q,
        ...payload,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
