import { loadResources, topicsMatch } from '../resources-api';
import { createEmbeddingClient } from '../semantic/embedding-client';
import { loadIndex } from '../semantic/chunk-index';
import {
  cosineSimilarity,
  GROWTH_SEMANTIC_DEDUP_THRESHOLD,
} from '../semantic/semantic-similarity';
import type { GrowthProposal } from './types';

function proposalEmbeddingText(proposal: GrowthProposal): string {
  return [proposal.title, proposal.topic, proposal.rationale].filter(Boolean).join('\n').trim();
}

/**
 * Phase 2: vector similarity against indexed corpus (same industry, published resources).
 */
async function getSemanticDuplicateBlockReason(
  proposal: GrowthProposal
): Promise<string | null> {
  const { chunks } = await loadIndex();
  if (chunks.length === 0) return null;

  const resources = await loadResources();
  const resourceById = new Map(resources.map((r) => [r.id, r]));
  const client = createEmbeddingClient();
  const [proposalVec] = await client.embed([proposalEmbeddingText(proposal)]);
  if (!proposalVec?.length) return null;

  let bestScore = 0;
  let bestTitle = '';
  let bestSnippet = '';

  for (const ch of chunks) {
    const resource = resourceById.get(ch.resourceId);
    if (!resource || resource.industry !== proposal.industry) continue;
    if (proposal.kind === 'resource' && resource.status !== 'published') continue;
    if (resource.isStarterBlock) continue;

    const score = cosineSimilarity(proposalVec, ch.vector);
    if (score > bestScore) {
      bestScore = score;
      bestTitle = resource.title;
      bestSnippet = ch.text.length > 60 ? `${ch.text.slice(0, 60).trim()}…` : ch.text.trim();
    }
  }

  if (bestScore >= GROWTH_SEMANTIC_DEDUP_THRESHOLD) {
    const pct = Math.round(bestScore * 100);
    return `Semantically similar published content exists (${bestTitle}, ${pct}% match). "${bestSnippet}" — improve existing content instead of duplicating.`;
  }

  return null;
}

/**
 * Pre-materialize guard: topic/title rules (v1) plus semantic vector similarity (phase 2).
 */
export async function getGrowthMaterializeBlockReason(
  proposal: GrowthProposal
): Promise<string | null> {
  const resources = await loadResources();
  const sameTopic = resources.filter(
    (r) => r.industry === proposal.industry && topicsMatch(r.topic, proposal.topic)
  );

  const published = sameTopic.find((r) => r.status === 'published' && !r.isStarterBlock);
  if (published && proposal.kind === 'resource') {
    return `A published resource already covers ${proposal.industry} / ${proposal.topic} (${published.title}). Improve it instead of creating a duplicate.`;
  }

  const nearTitle = sameTopic.find((r) => {
    const a = r.title.toLowerCase().trim();
    const b = proposal.title.toLowerCase().trim();
    return a === b || a.includes(b) || b.includes(a);
  });
  if (nearTitle && proposal.kind === 'resource') {
    return `A resource with a similar title already exists (${nearTitle.title}).`;
  }

  if (proposal.kind === 'case_study') {
    const caseResource = sameTopic.find(
      (r) => r.metadata?.growthKind === 'case_study' || r.id.includes('-growth-')
    );
    if (caseResource && caseResource.status === 'published') {
      return `Case study resource already published for ${proposal.industry} / ${proposal.topic}.`;
    }
  }

  return getSemanticDuplicateBlockReason(proposal);
}
