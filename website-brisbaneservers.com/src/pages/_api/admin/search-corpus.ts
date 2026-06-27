import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { createEmbeddingClient } from '../../../lib/semantic/embedding-client';
import { getSemanticIndexStats, loadIndex } from '../../../lib/semantic/chunk-index';
import { EMBEDDING_DIM } from '../../../lib/semantic/embedding-version';
import {
  getPropositionIdentityText,
  getPropositionPillars,
  getAllPropositionKeywords,
} from '../../../lib/search/proposition-corpus';

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

function corpusCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  const norm = Math.sqrt(sum.reduce((s, x) => s + x * x, 0)) || 1;
  return sum.map((x) => x / norm);
}

/**
 * Admin: search/RAG corpus identity — keywords, vector stats, proposition alignment.
 * GET /api/admin/search-corpus
 */
export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      {
        status: authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const [semantic, index, client] = await Promise.all([
      getSemanticIndexStats(),
      loadIndex(),
      Promise.resolve(createEmbeddingClient()),
    ]);

    const sampleVectors = index.chunks.slice(0, 200).map((c) => c.vector);
    const centroid = corpusCentroid(sampleVectors);
    const [identityEmb] = await client.embed([getPropositionIdentityText()]);
    const identityStrength =
      centroid.length > 0
        ? Math.round(Math.max(0, Math.min(100, cosine(identityEmb, centroid) * 100)))
        : 0;

    const pillars = getPropositionPillars().map((p) => ({
      ...p,
      keywordCount: p.keywords.length,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        semanticIndex: semantic,
        embedding: {
          modelId: client.modelId,
          provider: client.provider,
          dimensions: EMBEDDING_DIM,
        },
        proposition: {
          pillars,
          allKeywords: getAllPropositionKeywords(),
          identityStrength,
          identityLabel:
            identityStrength >= 70
              ? 'Strong alignment'
              : identityStrength >= 45
                ? 'Moderate alignment'
                : 'Building alignment',
        },
        pipeline: {
          publicSearchPath: '/api/resources/search',
          ragPath: '/api/semantic/search',
          storage: 'Neon corpus + semantic chunk index',
        },
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
