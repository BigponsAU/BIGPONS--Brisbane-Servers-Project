import { loadResources, topicsMatch } from '../resources-api';
import type { GrowthProposal } from './types';

/**
 * Pre-materialize guard: block obvious duplicates before voice generation spend.
 * Phase 2 can add semantic vector similarity; v1 uses topic + published state.
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

  return null;
}
