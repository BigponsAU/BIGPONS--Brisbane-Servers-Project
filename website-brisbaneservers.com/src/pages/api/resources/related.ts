import type { APIRoute } from 'astro';
import { loadResources, isPublicResource } from '../../../lib/resources-api';
import { createEmbeddingClient } from '../../../lib/semantic/embedding-client';
import { searchSimilar } from '../../../lib/semantic/chunk-index';
import { checkRateLimit, getClientKey } from '../../../lib/rate-limit';

const MAX_REQ_PER_MIN = 60;

/**
 * Public related resources by semantic similarity (published slice only).
 * GET /api/resources/related?id=resourceId&limit=5
 */
export const GET: APIRoute = async ({ request }) => {
  const key = `related:${getClientKey(request)}`;
  const rl = checkRateLimit(key, MAX_REQ_PER_MIN, 60_000);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT', success: false }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000))
        }
      }
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const limit = Math.min(10, Math.max(1, parseInt(url.searchParams.get('limit') || '5', 10) || 5));

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'id query param required', code: 'MISSING_FIELDS', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resources = await loadResources();
    const origin = resources.find((r) => r.id === id);
    if (!origin || !isPublicResource(origin)) {
      return new Response(
        JSON.stringify({ error: 'Resource not found', code: 'NOT_FOUND', success: false }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const client = createEmbeddingClient();
    const qText = `${origin.title}\n${origin.description}\n${origin.content.slice(0, 800)}`;
    const [qEmb] = await client.embed([qText]);
    const hits = await searchSimilar(qEmb, {
      topK: limit * 3,
      excludeResourceIds: new Set([id]),
      publishedOnly: true,
      resources
    });

    const seen = new Set<string>();
    const related: Array<{ id: string; title: string; industry: string; topic: string; score: number }> = [];
    for (const h of hits) {
      if (related.length >= limit) break;
      const rid = h.chunk.resourceId;
      if (seen.has(rid)) continue;
      const res = resources.find((r) => r.id === rid);
      if (!res || !isPublicResource(res)) continue;
      seen.add(rid);
      related.push({
        id: res.id,
        title: res.title,
        industry: res.industry,
        topic: res.topic,
        score: h.score
      });
    }

    return new Response(
      JSON.stringify({ success: true, related }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600'
        }
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
