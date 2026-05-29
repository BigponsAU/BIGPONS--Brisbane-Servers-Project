import { industries } from '../../data/industries';
import { computeAnalyticsSummary } from '../analytics';
import { loadResources, normalizeTopicSlug, topicsMatch } from '../resources-api';
import type { GrowthProposal, GrowthProposalKind, LibraryGrowthConfig } from './types';

interface TopicSlot {
  industry: string;
  industryName: string;
  topic: string;
  topicName: string;
  priority: number;
  rationale: string;
}

function slugPair(industry: string, topic: string): string {
  return `${industry}:${normalizeTopicSlug(topic)}`;
}

export async function planGrowthProposals(config: LibraryGrowthConfig): Promise<
  Omit<GrowthProposal, 'id' | 'createdAt' | 'updatedAt' | 'status'>[]
> {
  const [resources, analytics] = await Promise.all([
    loadResources(),
    computeAnalyticsSummary(),
  ]);

  const publishedKeys = new Set(
    resources
      .filter((r) => r.status === 'published' && !r.isStarterBlock)
      .map((r) => slugPair(r.industry, r.topic))
  );

  const pendingByKey = new Map<string, number>();
  analytics.topics.forEach((t) => {
    if (t.pending > 0) {
      pendingByKey.set(slugPair(t.industry, t.topic), t.pending);
    }
  });

  const slots: TopicSlot[] = [];

  for (const industry of industries) {
    for (const topic of industry.topics) {
      const key = slugPair(industry.slug, topic.slug);
      const hasPublished = publishedKeys.has(key);
      const hasAny = resources.some(
        (r) => r.industry === industry.slug && topicsMatch(r.topic, topic.slug)
      );
      let priority = 0;
      const reasons: string[] = [];

      if (!hasPublished) {
        priority += hasAny ? 2 : 4;
        reasons.push(hasAny ? 'draft exists but nothing published yet' : 'no library entry for this topic');
      }
      const pending = pendingByKey.get(key) ?? 0;
      if (pending > 0) {
        priority += 3 + pending;
        reasons.push(`${pending} pending community contribution(s)`);
      }

      const topicMetrics = analytics.topics.find((t) => t.key === key);
      if (topicMetrics && topicMetrics.accepted >= 2 && !hasPublished) {
        priority += 2;
        reasons.push('strong contributor interest');
      }

      if (priority > 0) {
        slots.push({
          industry: industry.slug,
          industryName: industry.name,
          topic: topic.slug,
          topicName: topic.name,
          priority,
          rationale: reasons.join('; ') || 'expand aligned coverage',
        });
      }
    }
  }

  slots.sort((a, b) => b.priority - a.priority);
  const cap = config.maxProposalsPerCycle;
  const chosen = slots.slice(0, cap);

  const now = Date.now();
  return chosen.flatMap((slot, index) => {
    const kinds: GrowthProposalKind[] = ['resource'];
    if (config.generateCaseStudies && index % 2 === 1) {
      kinds.push('case_study');
    }
    return kinds.slice(0, 1).map((kind) => ({
      kind,
      industry: slot.industry,
      topic: slot.topic,
      title:
        kind === 'case_study'
          ? `Case study: ${slot.topicName} in ${slot.industryName}`
          : `${slot.topicName} — ${slot.industryName} guide`,
      rationale: slot.rationale,
      source: 'cycle' as const,
      estimatedVoiceScore: undefined,
    }));
  });
}
