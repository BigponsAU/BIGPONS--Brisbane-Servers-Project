import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { loadIndex } from '../../../lib/semantic/chunk-index';

const MAX_NODES = 120;

/**
 * Semantic vector map — 2D projection of indexed chunks for voice map panel.
 * GET /api/voice-map/semantic?limit=
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
    const { chunks } = await loadIndex();

    const sample = chunks.slice(0, limit);
    const nodes = sample.map((chunk, index) => {
      const v = chunk.vector;
      let x = 0;
      let y = 0;
      if (v.length >= 2) {
        x = v[0] * 180;
        y = v[1] * 180;
      } else {
        const angle = (index / Math.max(sample.length, 1)) * Math.PI * 2;
        x = Math.cos(angle) * 6;
        y = Math.sin(angle) * 6;
      }
      const label =
        chunk.text.length > 48 ? `${chunk.text.slice(0, 48).trim()}…` : chunk.text.trim();
      return {
        id: chunk.id,
        resourceId: chunk.resourceId,
        chunkIndex: chunk.chunkIndex,
        label,
        x,
        y,
      };
    });

    const edges: Array<{ sourceId: string; targetId: string; strength: number }> = [];
    for (let i = 0; i < nodes.length - 1; i += 1) {
      if (nodes[i].resourceId === nodes[i + 1].resourceId) {
        edges.push({ sourceId: nodes[i].id, targetId: nodes[i + 1].id, strength: 0.6 });
      }
    }

    return new Response(
      JSON.stringify({
        nodes,
        edges,
        total: chunks.length,
        sampled: nodes.length,
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
