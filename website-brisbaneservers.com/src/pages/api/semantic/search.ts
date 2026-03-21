import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { loadResources } from '../../../lib/resources-api';
import { createEmbeddingClient } from '../../../lib/semantic/embedding-client';
import { searchSimilar } from '../../../lib/semantic/chunk-index';
import { checkRateLimit, getClientKey } from '../../../lib/rate-limit';

const MAX_REQ_PER_MIN = 30;

/**
 * Internal semantic similarity search (editor tooling). POST JSON: { query: string, topK?: number }
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      {
        status: authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const key = `semantic-search:${getClientKey(request)}`;
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
    const body = await request.json();
    const query = typeof body.query === 'string' ? body.query : '';
    const topK = typeof body.topK === 'number' ? Math.min(20, Math.max(1, body.topK)) : 8;
    if (!query.trim()) {
      return new Response(
        JSON.stringify({ error: 'query required', code: 'MISSING_FIELDS', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const client = createEmbeddingClient();
    const [qEmb] = await client.embed([query]);
    const resources = await loadResources();
    const hits = await searchSimilar(qEmb, { topK, resources });

    return new Response(
      JSON.stringify({
        success: true,
        modelId: client.modelId,
        hits: hits.map((h) => ({
          score: h.score,
          chunkId: h.chunk.id,
          resourceId: h.chunk.resourceId,
          textPreview: h.chunk.text.slice(0, 400)
        }))
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
