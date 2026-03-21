import type { Resource } from '../resource-types';
import { loadResources } from '../resources-api';
import { createEmbeddingClient } from './embedding-client';
import { searchSimilar } from './chunk-index';

const MAX_CONTEXT_CHARS = 6000;
const DEFAULT_TOP_K = 8;

export interface RagContext {
  /** Concatenated retrieval blocks for prompting */
  contextText: string;
  /** Chunk ids used */
  chunkIds: string[];
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
}): Promise<RagContext> {
  const start = Date.now();
  const client = createEmbeddingClient();
  const [qEmb] = await client.embed([query]);
  const resources = await loadResources();
  const exclude = options?.excludeResourceIds
    ? new Set(options.excludeResourceIds)
    : undefined;
  const topK = options?.topK ?? DEFAULT_TOP_K;

  let hits;
  if (options?.resourceId) {
    const local = await searchSimilar(qEmb, {
      topK: Math.max(3, topK),
      resourceId: options.resourceId,
      resources
    });
    if (local.length > 0) {
      hits = local;
    } else {
      hits = await searchSimilar(qEmb, {
        topK,
        excludeResourceIds: exclude,
        resources
      });
    }
  } else {
    hits = await searchSimilar(qEmb, {
      topK,
      excludeResourceIds: exclude,
      resources
    });
  }

  const parts: string[] = [];
  const chunkIds: string[] = [];
  let total = 0;
  for (const h of hits) {
    const block = `[${h.chunk.resourceId} #${h.chunk.chunkIndex}] ${h.chunk.text}`;
    if (total + block.length > MAX_CONTEXT_CHARS) break;
    parts.push(block);
    chunkIds.push(h.chunk.id);
    total += block.length;
  }

  return {
    contextText: parts.join('\n\n---\n\n'),
    chunkIds,
    retrievalMs: Date.now() - start,
    modelId: client.modelId
  };
}
