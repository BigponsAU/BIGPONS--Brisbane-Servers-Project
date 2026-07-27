import type { Resource } from '../resource-types';
import { loadResources } from '../resources-api';
import { createEmbeddingClient } from './embedding-client';
import { searchSimilar } from './chunk-index';

const MAX_CONTEXT_CHARS = 6000;
const DEFAULT_TOP_K = 8;
/** Default floor when callers ask for industry-scoped global fallback. */
const DEFAULT_MIN_SCORE = 0.28;

export interface RagContext {
  /** Concatenated retrieval blocks for prompting */
  contextText: string;
  /** Chunk ids used */
  chunkIds: string[];
  /** Distinct parent resource ids for chunks used (Markov lineage). */
  sourceResourceIds: string[];
  /** Latency and debug */
  retrievalMs: number;
  modelId: string;
}

export async function buildRagContext(query: string, options?: {
  topK?: number;
  /** Prefer chunks from this resource (e.g. improve flow) */
  resourceId?: string;
  /** Exclude these resource ids from retrieval */
  excludeResourceIds?: string[];
  /** Prefer same-industry parents when falling back to global search */
  industry?: string;
  /** Drop weak global matches (cosine). Local same-resource hits ignore this floor. */
  minScore?: number;
}): Promise<RagContext> {
  const start = Date.now();
  const client = createEmbeddingClient();
  const [qEmb] = await client.embed([query]);
  const resources = await loadResources();
  const exclude = options?.excludeResourceIds
    ? new Set(options.excludeResourceIds)
    : undefined;
  const topK = options?.topK ?? DEFAULT_TOP_K;
  const minScore = options?.minScore;
  const industryNorm = options?.industry?.trim().toLowerCase();

  const industryAllowed = industryNorm
    ? new Set(
        resources
          .filter((r) => (r.industry ?? '').trim().toLowerCase() === industryNorm)
          .map((r) => r.id)
      )
    : null;

  let hits;
  let usedLocal = false;
  if (options?.resourceId) {
    const local = await searchSimilar(qEmb, {
      topK: Math.max(3, topK),
      resourceId: options.resourceId,
      resources
    });
    if (local.length > 0) {
      hits = local;
      usedLocal = true;
    } else {
      hits = await searchSimilar(qEmb, {
        topK: Math.max(topK * 3, 12),
        excludeResourceIds: exclude,
        resources
      });
    }
  } else {
    hits = await searchSimilar(qEmb, {
      topK: Math.max(topK * 3, 12),
      excludeResourceIds: exclude,
      resources
    });
  }

  if (!usedLocal) {
    const floor = minScore ?? (industryAllowed ? DEFAULT_MIN_SCORE : undefined);
    hits = hits.filter((h) => {
      if (floor != null && h.score < floor) return false;
      if (industryAllowed && industryAllowed.size > 0 && !industryAllowed.has(h.chunk.resourceId)) {
        return false;
      }
      return true;
    });
    hits = hits.slice(0, topK);
  }

  const parts: string[] = [];
  const chunkIds: string[] = [];
  const sourceIds: string[] = [];
  const seenSources = new Set<string>();
  let total = 0;
  for (const h of hits) {
    const block = `[${h.chunk.resourceId} #${h.chunk.chunkIndex}] ${h.chunk.text}`;
    if (total + block.length > MAX_CONTEXT_CHARS) break;
    parts.push(block);
    chunkIds.push(h.chunk.id);
    if (!seenSources.has(h.chunk.resourceId)) {
      seenSources.add(h.chunk.resourceId);
      sourceIds.push(h.chunk.resourceId);
    }
    total += block.length;
  }

  return {
    contextText: parts.join('\n\n---\n\n'),
    chunkIds,
    sourceResourceIds: sourceIds,
    retrievalMs: Date.now() - start,
    modelId: client.modelId
  };
}
