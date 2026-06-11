import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { loadResources } from '../../../lib/resources-api';
import { loadIndex } from '../../../lib/semantic/chunk-index';
import { getVoiceFramework } from '../../../utils/voice-framework';
import {
  BRISBANE_PROFILE_NAME,
  findBrisbaneProfileMeta,
  resourcesForVoiceMapIndex,
} from '../../../lib/brisbane-profile';
import {
  aggregateResourceCentroids,
  projectVectorTo2D,
  type VoiceMapEdge,
  type VoiceMapNode,
} from '../../../lib/voice-map-projection';

const MAX_CHUNKS = 200;

/**
 * Unified voice map: semantic resources + Brisbane profile hub + optional chunk detail.
 * GET /api/voice-map/corpus?layer=resources|chunks
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
    const layer = url.searchParams.get('layer') === 'chunks' ? 'chunks' : 'resources';
    const resources = await loadResources();
    const indexable = resourcesForVoiceMapIndex(resources);
    const resourceMeta = new Map(
      indexable.map((r) => [r.id, { title: r.title, industry: r.industry || 'general' }])
    );

    const { chunks: allChunks } = await loadIndex();
    const corpusIds = new Set(indexable.map((r) => r.id));
    const chunks = allChunks.filter((c) => corpusIds.has(c.resourceId)).slice(0, MAX_CHUNKS);

    const { profileManager } = await getVoiceFramework();
    const brisbaneMeta = findBrisbaneProfileMeta(profileManager.getAllProfiles());

    let nodes: VoiceMapNode[] = [];
    const edges: VoiceMapEdge[] = [];

    if (layer === 'chunks') {
      nodes = chunks.map((ch, i) => {
        const meta = resourceMeta.get(ch.resourceId);
        const { x, y } = projectVectorTo2D(ch.vector, i, chunks.length);
        const label =
          ch.text.length > 40 ? `${ch.text.slice(0, 40).trim()}…` : ch.text.trim();
        return {
          id: ch.id,
          label,
          x,
          y,
          kind: 'chunk' as const,
          industry: meta?.industry,
          resourceId: ch.resourceId,
        };
      });
      for (let i = 0; i < chunks.length - 1; i += 1) {
        if (chunks[i].resourceId === chunks[i + 1].resourceId) {
          edges.push({
            id: `seq-${chunks[i].id}-${chunks[i + 1].id}`,
            sourceId: chunks[i].id,
            targetId: chunks[i + 1].id,
            strength: 0.5,
            kind: 'sequential',
          });
        }
      }
    } else {
      nodes = aggregateResourceCentroids(chunks, resourceMeta);

      const byIndustry = new Map<string, string[]>();
      for (const n of nodes) {
        const ind = n.industry ?? 'general';
        const list = byIndustry.get(ind) ?? [];
        list.push(n.id);
        byIndustry.set(ind, list);
      }

      for (const n of nodes) {
        if (brisbaneMeta) {
          edges.push({
            id: `profile-${brisbaneMeta.id}-${n.id}`,
            sourceId: `profile:${brisbaneMeta.id}`,
            targetId: n.id,
            strength: 0.35,
            kind: 'profile',
          });
        }
      }

      if (brisbaneMeta) {
        nodes.unshift({
          id: `profile:${brisbaneMeta.id}`,
          label: BRISBANE_PROFILE_NAME,
          x: 0,
          y: 0,
          kind: 'profile',
          profileId: brisbaneMeta.id,
        });
      }

      for (const [, ids] of byIndustry) {
        if (ids.length < 2) continue;
        for (let i = 0; i < ids.length - 1; i += 1) {
          edges.push({
            id: `ind-${ids[i]}-${ids[i + 1]}`,
            sourceId: ids[i],
            targetId: ids[i + 1],
            strength: 0.2,
            kind: 'same-industry',
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        layer,
        nodes,
        edges,
        brisbaneProfile: brisbaneMeta
          ? {
              id: brisbaneMeta.id,
              name: brisbaneMeta.name,
              corpusResourceIds: brisbaneMeta.corpusResourceIds ?? [],
              isDefault: brisbaneMeta.isDefault,
            }
          : null,
        stats: {
          indexedResources: indexable.length,
          chunksInIndex: allChunks.filter((c) => corpusIds.has(c.resourceId)).length,
          industries: [...new Set(indexable.map((r) => r.industry))].filter(Boolean),
        },
        total: nodes.length,
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
