import { industries } from '../data/industries';
import { loadResources, normalizeTopicSlug, topicsMatch } from './resources-api';
import { loadContributions, type Contribution } from './contributions';
import { loadPipelineConfig, type PipelineConfig } from './pipeline-config';
import { getSemanticIndexStats } from './semantic/chunk-index';

export interface TopicMetrics {
  industry: string;
  topic: string;
  key: string;
  contributions: number;
  accepted: number;
  rejected: number;
  pending: number;
  avgVoiceScore: number | null;
}

export interface GlobalMetrics {
  totalContributions: number;
  totalAccepted: number;
  totalRejected: number;
  totalPending: number;
  acceptanceRate: number | null;
  avgVoiceScore: number | null;
}

export interface AnalyticsSummary {
  topics: TopicMetrics[];
  global: GlobalMetrics;
}

export type CoverageStatus = 'gap' | 'sparse' | 'covered';

export interface TopicCoverageRow {
  industry: string;
  industryName: string;
  topic: string;
  topicName: string;
  key: string;
  status: CoverageStatus;
  published: number;
  drafts: number;
  starters: number;
  contributions: number;
  accepted: number;
  rejected: number;
  pending: number;
  avgVoiceScore: number | null;
  avgResourceVoiceScore: number | null;
}

export interface CoverageRollup {
  totalSlots: number;
  gap: number;
  sparse: number;
  covered: number;
  coveragePercent: number;
}

export interface CorpusResourceStats {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  starters: number;
  userPublished: number;
  avgVoiceScore: number | null;
}

export interface CorpusIndexStats {
  chunkCount: number;
  indexedResources: number;
  embeddingModels: Record<string, number>;
  publishCoveragePercent: number | null;
}

export interface CorpusAnalytics {
  summary: AnalyticsSummary;
  corpus: CorpusResourceStats;
  coverage: CoverageRollup;
  topics: TopicCoverageRow[];
  gaps: TopicCoverageRow[];
  index: CorpusIndexStats;
}

export type SuggestionType = 'threshold' | 'starter_block';

export interface AnalyticsSuggestion {
  id: string;
  type: SuggestionType;
  message: string;
  details: Record<string, unknown>;
  recommendedChange?: {
    configKey: keyof PipelineConfig;
    newValue: number;
  };
}

function slugPair(industry: string, topic: string): string {
  return `${industry}:${normalizeTopicSlug(topic)}`;
}

function coverageStatus(published: number): CoverageStatus {
  if (published <= 0) return 'gap';
  if (published < 2) return 'sparse';
  return 'covered';
}

function avg(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

export async function computeAnalyticsSummary(): Promise<AnalyticsSummary> {
  const contributions = await loadContributions();

  const byKey = new Map<string, TopicMetrics & { scores: number[] }>();

  const ensureTopic = (c: Contribution): TopicMetrics & { scores: number[] } => {
    const key = `${c.payload.industry}:${normalizeTopicSlug(c.payload.topic)}`;
    const existing = byKey.get(key);
    if (existing) return existing;
    const created: TopicMetrics & { scores: number[] } = {
      industry: c.payload.industry,
      topic: normalizeTopicSlug(c.payload.topic),
      key,
      contributions: 0,
      accepted: 0,
      rejected: 0,
      pending: 0,
      avgVoiceScore: null,
      scores: []
    };
    byKey.set(key, created);
    return created;
  };

  contributions.forEach((c) => {
    const t = ensureTopic(c);
    t.contributions += 1;
    if (c.status === 'accepted') t.accepted += 1;
    if (c.status === 'rejected') t.rejected += 1;
    if (c.status === 'pending') t.pending += 1;
    if (typeof c.analysis?.voiceScore === 'number') {
      t.scores.push(c.analysis.voiceScore);
    }
  });

  const topics: TopicMetrics[] = [];
  let totalVoiceScore = 0;
  let voiceScoreCount = 0;

  byKey.forEach((t) => {
    if (t.scores.length > 0) {
      t.avgVoiceScore = avg(t.scores);
      totalVoiceScore += t.scores.reduce((sum, s) => sum + s, 0);
      voiceScoreCount += t.scores.length;
    } else {
      t.avgVoiceScore = null;
    }
    delete (t as { scores?: number[] }).scores;
    topics.push(t);
  });

  const totalContributions = contributions.length;
  const totalAccepted = contributions.filter((c) => c.status === 'accepted').length;
  const totalRejected = contributions.filter((c) => c.status === 'rejected').length;
  const totalPending = contributions.filter((c) => c.status === 'pending').length;
  const decided = totalAccepted + totalRejected;

  const global: GlobalMetrics = {
    totalContributions,
    totalAccepted,
    totalRejected,
    totalPending,
    acceptanceRate: decided > 0 ? totalAccepted / decided : null,
    avgVoiceScore: voiceScoreCount > 0 ? totalVoiceScore / voiceScoreCount : null
  };

  return { topics, global };
}

export async function computeCorpusAnalytics(): Promise<CorpusAnalytics> {
  const [summary, resources, indexStats] = await Promise.all([
    computeAnalyticsSummary(),
    loadResources(),
    getSemanticIndexStats()
  ]);

  const contributionByKey = new Map(summary.topics.map((t) => [t.key, t]));

  const userResources = resources.filter((r) => !r.isStarterBlock);
  const publishedResources = userResources.filter((r) => r.status === 'published');
  const draftResources = userResources.filter((r) => r.status === 'draft');
  const archivedResources = userResources.filter((r) => r.status === 'archived');
  const starters = resources.filter((r) => r.isStarterBlock);

  const resourceScores = userResources
    .map((r) => r.metadata?.voiceScore)
    .filter((s): s is number => typeof s === 'number' && !Number.isNaN(s));

  const corpus: CorpusResourceStats = {
    total: resources.length,
    published: publishedResources.length,
    drafts: draftResources.length,
    archived: archivedResources.length,
    starters: starters.length,
    userPublished: publishedResources.length,
    avgVoiceScore: avg(resourceScores)
  };

  const topics: TopicCoverageRow[] = [];

  for (const industry of industries) {
    for (const topic of industry.topics) {
      const key = slugPair(industry.slug, topic.slug);
      const matching = resources.filter(
        (r) => r.industry === industry.slug && topicsMatch(r.topic, topic.slug)
      );
      const published = matching.filter((r) => r.status === 'published' && !r.isStarterBlock).length;
      const drafts = matching.filter((r) => r.status === 'draft' && !r.isStarterBlock).length;
      const starterCount = matching.filter((r) => r.isStarterBlock).length;
      const contrib = contributionByKey.get(key);
      const resourceVoiceScores = matching
        .filter((r) => !r.isStarterBlock)
        .map((r) => r.metadata?.voiceScore)
        .filter((s): s is number => typeof s === 'number' && !Number.isNaN(s));

      topics.push({
        industry: industry.slug,
        industryName: industry.name,
        topic: topic.slug,
        topicName: topic.name,
        key,
        status: coverageStatus(published),
        published,
        drafts,
        starters: starterCount,
        contributions: contrib?.contributions ?? 0,
        accepted: contrib?.accepted ?? 0,
        rejected: contrib?.rejected ?? 0,
        pending: contrib?.pending ?? 0,
        avgVoiceScore: contrib?.avgVoiceScore ?? null,
        avgResourceVoiceScore: avg(resourceVoiceScores)
      });
    }
  }

  // Include contribution-only topics that are not in the catalog
  for (const contrib of summary.topics) {
    if (topics.some((t) => t.key === contrib.key)) continue;
    topics.push({
      industry: contrib.industry,
      industryName: contrib.industry,
      topic: contrib.topic,
      topicName: contrib.topic,
      key: contrib.key,
      status: 'gap',
      published: 0,
      drafts: 0,
      starters: 0,
      contributions: contrib.contributions,
      accepted: contrib.accepted,
      rejected: contrib.rejected,
      pending: contrib.pending,
      avgVoiceScore: contrib.avgVoiceScore,
      avgResourceVoiceScore: null
    });
  }

  topics.sort((a, b) => {
    const statusRank = { gap: 0, sparse: 1, covered: 2 } as const;
    const byStatus = statusRank[a.status] - statusRank[b.status];
    if (byStatus !== 0) return byStatus;
    const byPending = b.pending - a.pending;
    if (byPending !== 0) return byPending;
    return a.industryName.localeCompare(b.industryName) || a.topicName.localeCompare(b.topicName);
  });

  const gap = topics.filter((t) => t.status === 'gap').length;
  const sparse = topics.filter((t) => t.status === 'sparse').length;
  const covered = topics.filter((t) => t.status === 'covered').length;
  const totalSlots = topics.length;
  const coverage: CoverageRollup = {
    totalSlots,
    gap,
    sparse,
    covered,
    coveragePercent: totalSlots > 0 ? Math.round(((sparse * 0.5 + covered) / totalSlots) * 100) : 0
  };

  const gaps = topics
    .filter((t) => t.status === 'gap' || t.status === 'sparse' || t.pending > 0)
    .slice(0, 24);

  const publishCoveragePercent =
    publishedResources.length > 0
      ? Math.round((indexStats.resourceIds / publishedResources.length) * 100)
      : indexStats.resourceIds > 0
        ? 100
        : null;

  return {
    summary,
    corpus,
    coverage,
    topics,
    gaps,
    index: {
      chunkCount: indexStats.chunkCount,
      indexedResources: indexStats.resourceIds,
      embeddingModels: indexStats.embeddingModels,
      publishCoveragePercent
    }
  };
}

export async function computeAnalyticsSuggestions(): Promise<{
  summary: AnalyticsSummary;
  config: PipelineConfig;
  suggestions: AnalyticsSuggestion[];
}> {
  const [summary, config, resources] = await Promise.all([
    computeAnalyticsSummary(),
    loadPipelineConfig(),
    loadResources()
  ]);

  const suggestions: AnalyticsSuggestion[] = [];

  if (summary.global.avgVoiceScore !== null) {
    const avgScore = summary.global.avgVoiceScore;
    const current = config.autoPublishThreshold;

    if (avgScore > current + 0.1) {
      suggestions.push({
        id: 'threshold-raise',
        type: 'threshold',
        message: `Average contribution voice score (${avgScore.toFixed(
          2
        )}) is higher than the auto-publish threshold (${current.toFixed(
          2
        )}). Consider tightening auto-approval.`,
        details: { avgVoiceScore: avgScore, currentThreshold: current },
        recommendedChange: {
          configKey: 'autoPublishThreshold',
          newValue: Math.min(0.95, +(current + 0.05).toFixed(2))
        }
      });
    }

    if (avgScore < current - 0.1) {
      suggestions.push({
        id: 'threshold-lower',
        type: 'threshold',
        message: `Average contribution voice score (${avgScore.toFixed(
          2
        )}) is below the auto-publish threshold (${current.toFixed(
          2
        )}). Consider loosening auto-approval.`,
        details: { avgVoiceScore: avgScore, currentThreshold: current },
        recommendedChange: {
          configKey: 'autoPublishThreshold',
          newValue: Math.max(0.5, +(current - 0.05).toFixed(2))
        }
      });
    }
  }

  summary.topics
    .filter((t) => t.contributions >= 3 && t.rejected / t.contributions >= 0.5)
    .forEach((t) => {
      const existingStarter = resources.some(
        (r) =>
          r.industry === t.industry &&
          normalizeTopicSlug(r.topic) === t.topic &&
          r.isStarterBlock
      );
      if (!existingStarter) {
        suggestions.push({
          id: `starter-${t.key}`,
          type: 'starter_block',
          message: `Topic "${t.topic}" in industry "${t.industry}" has a high rejection rate. Consider adding a curated starter resource to guide contributions.`,
          details: {
            industry: t.industry,
            topic: t.topic,
            contributions: t.contributions,
            rejected: t.rejected
          }
        });
      }
    });

  return { summary, config, suggestions };
}
