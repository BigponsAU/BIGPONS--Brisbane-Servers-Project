/**
 * Hybrid public search: semantic chunk retrieval + proposition keyword boost.
 */
import { loadResources, isPublicResource } from '../resources-api';
import type { Resource } from '../resource-types';
import { normalizeTopicSlug } from '../resource-slug';
import { createEmbeddingClient } from '../semantic/embedding-client';
import { searchSimilar } from '../semantic/chunk-index';
import { EMBEDDING_DIM } from '../semantic/embedding-version';
import {
  getPropositionIdentityText,
  matchPropositionKeywords,
  propositionKeywordScore,
} from './proposition-corpus';

export type PublicSearchMatchSource = 'semantic' | 'keyword' | 'hybrid';

export interface PublicSearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  industry?: string;
  topic?: string;
  score: number;
  strength: number;
  matchSource: PublicSearchMatchSource;
  matchedKeywords: string[];
}

function resourceUrl(resource: Resource): string {
  return `resources/item/${resource.id}/index.html`;
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

function strengthFromScore(semantic: number, keywordBoost: number): number {
  const base = Math.max(0, Math.min(1, semantic));
  const blended = base * 0.85 + (keywordBoost / 100) * 0.15;
  return Math.round(Math.max(0, Math.min(100, blended * 100)));
}

export async function searchPublicResources(query: string, limit = 8): Promise<{
  results: PublicSearchResult[];
  embeddingModel: string;
  embeddingProvider: string;
  embeddingDim: number;
  propositionKeywords: string[];
  propositionAlignment: number;
}> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      results: [],
      embeddingModel: '',
      embeddingProvider: '',
      embeddingDim: EMBEDDING_DIM,
      propositionKeywords: [],
      propositionAlignment: 0,
    };
  }

  const resources = await loadResources();
  const published = resources.filter(isPublicResource);
  const propositionKeywords = matchPropositionKeywords(trimmed);
  const client = createEmbeddingClient();
  const [queryEmb, identityEmb] = await client.embed([trimmed, getPropositionIdentityText()]);
  const propositionAlignment = Math.round(Math.max(0, Math.min(100, cosine(queryEmb, identityEmb) * 100)));

  const hits = await searchSimilar(queryEmb, {
    topK: limit * 4,
    publishedOnly: true,
    resources,
  });

  const byResource = new Map<string, { semantic: number; chunkPreview: string }>();
  for (const hit of hits) {
    const prev = byResource.get(hit.chunk.resourceId);
    if (!prev || hit.score > prev.semantic) {
      byResource.set(hit.chunk.resourceId, { semantic: hit.score, chunkPreview: hit.chunk.text });
    }
  }

  const results: PublicSearchResult[] = [];

  for (const resource of published) {
    const semanticHit = byResource.get(resource.id);
    const textBlob = `${resource.title} ${resource.description} ${resource.content.slice(0, 600)}`;
    const kwScore = propositionKeywordScore(trimmed, textBlob);
    const queryTokens = trimmed.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
    const titleDesc = `${resource.title} ${resource.description}`.toLowerCase();
    const lexicalHits = queryTokens.filter((t) => titleDesc.includes(t));
    const lexicalBoost = lexicalHits.length > 0 ? Math.min(0.35, lexicalHits.length * 0.08) : 0;

    let semantic = semanticHit?.semantic ?? 0;
    if (!semanticHit && lexicalHits.length > 0) {
      semantic = lexicalBoost;
    }

    if (semantic <= 0 && kwScore <= 0 && lexicalHits.length === 0) continue;

    const combined = Math.min(1, semantic + lexicalBoost * 0.5 + (kwScore / 100) * 0.2);
    const matchSource: PublicSearchMatchSource =
      semanticHit && (kwScore > 0 || lexicalHits.length > 0)
        ? 'hybrid'
        : semanticHit
          ? 'semantic'
          : 'keyword';

    const matchedKeywords = [
      ...propositionKeywords.filter((k) => textBlob.toLowerCase().includes(k)),
      ...lexicalHits,
    ].slice(0, 8);

    results.push({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      url: resourceUrl(resource),
      industry: resource.industry,
      topic: normalizeTopicSlug(resource.topic),
      score: combined,
      strength: strengthFromScore(combined, kwScore),
      matchSource,
      matchedKeywords: [...new Set(matchedKeywords)],
    });
  }

  results.sort((a, b) => b.score - a.score);

  return {
    results: results.slice(0, limit),
    embeddingModel: client.modelId,
    embeddingProvider: client.provider,
    embeddingDim: EMBEDDING_DIM,
    propositionKeywords,
    propositionAlignment,
  };
}
