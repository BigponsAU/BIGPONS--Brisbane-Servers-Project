/**
 * Unified semantic chunk + vector index.
 * Postgres (Neon) when DATABASE_URL is set; else JSON file on disk.
 */

import { CORPUS_DOC_KEYS, readCorpusJson, saveCorpusJson } from '../corpus-store';
import { getSemanticIndexFile } from '../storage-paths';
import type { Resource } from '../resource-types';
import { createEmbeddingClient } from './embedding-client';
import { DEFAULT_EMBEDDING_VERSION } from './embedding-version';
import { chunkResource } from './chunker';

export interface IndexedChunk {
  id: string;
  resourceId: string;
  chunkIndex: number;
  text: string;
  vector: number[];
  embeddingModel: string;
  embeddingVersion: number;
}

interface SemanticIndexFile {
  version: number;
  chunks: IndexedChunk[];
}

const INDEX_VERSION = 1;

let writeChain: Promise<void> = Promise.resolve();

const emptyIndex = (): SemanticIndexFile => ({ version: INDEX_VERSION, chunks: [] });

export async function loadIndex(): Promise<SemanticIndexFile> {
  const data = await readCorpusJson<SemanticIndexFile>(
    CORPUS_DOC_KEYS.SEMANTIC_INDEX,
    getSemanticIndexFile(),
    emptyIndex()
  );
  if (!data.chunks || !Array.isArray(data.chunks)) {
    return emptyIndex();
  }
  return data;
}

async function saveIndex(data: SemanticIndexFile): Promise<void> {
  await saveCorpusJson(CORPUS_DOC_KEYS.SEMANTIC_INDEX, getSemanticIndexFile(), data);
}

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

export async function searchSimilar(
  queryEmbedding: number[],
  options: {
    topK: number;
    resourceId?: string;
    excludeResourceIds?: Set<string>;
    publishedOnly?: boolean;
    resources?: Resource[];
  }
): Promise<Array<{ chunk: IndexedChunk; score: number }>> {
  const { topK, resourceId, excludeResourceIds, publishedOnly, resources } = options;
  const { chunks } = await loadIndex();
  const publishedSet = new Set<string>();
  if (publishedOnly && resources) {
    for (const r of resources) {
      if (r.status === 'published' && (r.visibility === undefined || r.visibility === 'public')) {
        publishedSet.add(r.id);
      }
    }
  }

  const scored: Array<{ chunk: IndexedChunk; score: number }> = [];
  for (const ch of chunks) {
    if (resourceId && ch.resourceId !== resourceId) continue;
    if (excludeResourceIds?.has(ch.resourceId)) continue;
    if (publishedOnly && !publishedSet.has(ch.resourceId)) continue;
    const score = cosine(queryEmbedding, ch.vector);
    scored.push({ chunk: ch, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function removeChunksForResource(resourceId: string): Promise<void> {
  writeChain = writeChain.then(async () => {
    const data = await loadIndex();
    data.chunks = data.chunks.filter((c) => c.resourceId !== resourceId);
    await saveIndex(data);
  });
  return writeChain;
}

export async function indexResource(resource: Resource): Promise<IndexedChunk[]> {
  const client = createEmbeddingClient();
  const textChunks = chunkResource(resource);
  if (textChunks.length === 0) {
    await removeChunksForResource(resource.id);
    return [];
  }
  const embeddings = await client.embed(textChunks.map((c) => c.text));
  const indexed: IndexedChunk[] = textChunks.map((c, i) => ({
    id: c.id,
    resourceId: c.resourceId,
    chunkIndex: c.chunkIndex,
    text: c.text,
    vector: embeddings[i] || [],
    embeddingModel: client.modelId,
    embeddingVersion: DEFAULT_EMBEDDING_VERSION
  }));

  writeChain = writeChain.then(async () => {
    const data = await loadIndex();
    data.chunks = data.chunks.filter((x) => x.resourceId !== resource.id);
    data.chunks.push(...indexed);
    await saveIndex(data);
  });
  await writeChain;
  return indexed;
}

export async function getSemanticIndexStats(): Promise<{
  chunkCount: number;
  resourceIds: number;
  embeddingModels: Record<string, number>;
}> {
  const { chunks } = await loadIndex();
  const ids = new Set(chunks.map((c) => c.resourceId));
  const embeddingModels: Record<string, number> = {};
  for (const c of chunks) {
    embeddingModels[c.embeddingModel] = (embeddingModels[c.embeddingModel] || 0) + 1;
  }
  return {
    chunkCount: chunks.length,
    resourceIds: ids.size,
    embeddingModels
  };
}
