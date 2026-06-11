/**
 * 2D projection helpers for voice map visualisation.
 */

export interface VoiceMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: 'chunk' | 'resource' | 'principle' | 'profile';
  industry?: string;
  resourceId?: string;
  profileId?: string;
}

export interface VoiceMapEdge {
  id: string;
  sourceId: string;
  targetId: string;
  strength: number;
  kind: 'sequential' | 'same-resource' | 'same-industry' | 'principle' | 'profile';
}

/** Simple 2D projection from embedding vector (uses dims 0,1 with fallback polar layout). */
export function projectVectorTo2D(vector: number[], index: number, total: number): { x: number; y: number } {
  if (vector.length >= 2) {
    return { x: vector[0] * 200, y: vector[1] * 200 };
  }
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  return { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 };
}

/** Aggregate chunk centroids per resource for cleaner map layers. */
export function aggregateResourceCentroids(
  chunks: Array<{ id: string; resourceId: string; text: string; vector: number[] }>,
  resourceMeta: Map<string, { title: string; industry: string }>
): VoiceMapNode[] {
  const groups = new Map<string, { vectors: number[][]; label: string; industry: string }>();

  for (const ch of chunks) {
    const meta = resourceMeta.get(ch.resourceId);
    const industry = meta?.industry ?? 'general';
    const label = meta?.title ?? ch.resourceId;
    let g = groups.get(ch.resourceId);
    if (!g) {
      g = { vectors: [], label, industry };
      groups.set(ch.resourceId, g);
    }
    g.vectors.push(ch.vector);
  }

  const nodes: VoiceMapNode[] = [];
  let i = 0;
  for (const [resourceId, g] of groups) {
    const dim = g.vectors[0]?.length ?? 0;
    const centroid =
      dim > 0
        ? Array.from({ length: dim }, (_, d) => {
            const sum = g.vectors.reduce((s, v) => s + (v[d] ?? 0), 0);
            return sum / g.vectors.length;
          })
        : [];
    const { x, y } = projectVectorTo2D(centroid, i, groups.size);
    nodes.push({
      id: `resource:${resourceId}`,
      label: g.label,
      x,
      y,
      kind: 'resource',
      industry: g.industry,
      resourceId,
    });
    i += 1;
  }
  return nodes;
}
