import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { loadResources } from '../../../lib/resources-api';
import { loadIndex } from '../../../lib/semantic/chunk-index';
import { createEmbeddingClient } from '../../../lib/semantic/embedding-client';
import {
  cosineSimilarity,
  SEMANTIC_ROUTE_K,
  SEMANTIC_ROUTE_MIN_EDGE,
} from '../../../lib/semantic/semantic-similarity';
import { projectVectorTo2D } from '../../../lib/voice-map-projection';

const MAX_NODES = 120;

function buildSemanticEdges(
  nodes: Array<{ id: string; vector: number[] }>
): Array<{ id: string; sourceId: string; targetId: string; strength: number; kind: string }> {
  const edges: Array<{ id: string; sourceId: string; targetId: string; strength: number; kind: string }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < nodes.length; i += 1) {
    const scored = nodes
      .map((other, j) => ({
        other,
        score: i === j ? 0 : cosineSimilarity(nodes[i].vector, other.vector),
      }))
      .filter((x) => x.score >= SEMANTIC_ROUTE_MIN_EDGE)
      .sort((a, b) => b.score - a.score)
      .slice(0, SEMANTIC_ROUTE_K);

    for (const hit of scored) {
      const pair = [nodes[i].id, hit.other.id].sort().join('|');
      if (seen.has(pair)) continue;
      seen.add(pair);
      edges.push({
        id: `sem-${pair}`,
        sourceId: nodes[i].id,
        targetId: hit.other.id,
        strength: hit.score,
        kind: 'semantic',
      });
    }
  }

  return edges;
}

function buildQueryRoute(
  queryVec: number[],
  nodes: Array<{ id: string; vector: number[] }>,
  topK: number
): string[] {
  return nodes
    .map((n) => ({ id: n.id, score: cosineSimilarity(queryVec, n.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((n) => n.id);
}

/**
 * Semantic vector map — 2D projection + k-NN semantic route edges.
 * GET /api/voice-map/semantic?limit=&query=
 */
export const GET: APIRoute = async ({ request, url }) => {
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const limitParam = Number(url.searchParams.get('limit') ?? MAX_NODES);
    const limit = Math.min(Math.max(1, limitParam), MAX_NODES);
    const queryText = (url.searchParams.get('query') ?? '').trim();

    const resources = await loadResources();
    const resourceMeta = new Map(
      resources.map((r) => [r.id, { title: r.title, industry: r.industry || 'general' }])
    );

    const { chunks } = await loadIndex();
    const sample = chunks.slice(0, limit);

    const nodes = sample.map((chunk, index) => {
      const meta = resourceMeta.get(chunk.resourceId);
      const { x, y } = projectVectorTo2D(chunk.vector, index, sample.length);
      const label =
        chunk.text.length > 48 ? `${chunk.text.slice(0, 48).trim()}…` : chunk.text.trim();
      return {
        id: chunk.id,
        resourceId: chunk.resourceId,
        chunkIndex: chunk.chunkIndex,
        label,
        x,
        y,
        kind: 'chunk' as const,
        industry: meta?.industry,
        vector: chunk.vector,
      };
    });

    const edges = buildSemanticEdges(nodes);

    let routeNodeIds: string[] = [];
    let routeEdges: Array<{ sourceId: string; targetId: string; strength: number; kind: string }> = [];
    if (queryText.length >= 3) {
      const client = createEmbeddingClient();
      const [queryVec] = await client.embed([queryText]);
      routeNodeIds = buildQueryRoute(queryVec, nodes, Math.min(8, nodes.length));
      for (let i = 0; i < routeNodeIds.length - 1; i += 1) {
        routeEdges.push({
          sourceId: routeNodeIds[i],
          targetId: routeNodeIds[i + 1],
          strength: 0.95,
          kind: 'route',
        });
      }
    }

    const publicNodes = nodes.map(({ vector: _v, ...rest }) => rest);
    const allEdges = [...edges, ...routeEdges];

    return new Response(
      JSON.stringify({
        nodes: publicNodes,
        edges: allEdges,
        routeNodeIds,
        total: chunks.length,
        sampled: publicNodes.length,
        source: 'semantic',
        success: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
