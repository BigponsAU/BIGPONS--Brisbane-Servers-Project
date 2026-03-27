import { loadResources, normalizeTopicSlug } from './resources-api';
import { loadContributions, type Contribution } from './contributions';
import { loadLedger, type TokenLedgerEntry } from './token-ledger';
import { loadPipelineConfig, type PipelineConfig } from './pipeline-config';

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
  avgVoiceScore: number | null;
}

export interface AnalyticsSummary {
  topics: TopicMetrics[];
  global: GlobalMetrics;
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

export async function computeAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [contributions, ledger] = await Promise.all([
    loadContributions(),
    loadLedger()
  ]);

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
      const avg =
        t.scores.reduce((sum, s) => sum + s, 0) / t.scores.length;
      t.avgVoiceScore = avg;
      totalVoiceScore += t.scores.reduce((sum, s) => sum + s, 0);
      voiceScoreCount += t.scores.length;
    } else {
      t.avgVoiceScore = null;
    }
    delete (t as any).scores;
    topics.push(t);
  });

  const totalContributions = contributions.length;
  const totalAccepted = contributions.filter((c) => c.status === 'accepted').length;
  const totalRejected = contributions.filter((c) => c.status === 'rejected').length;

  const global: GlobalMetrics = {
    totalContributions,
    totalAccepted,
    totalRejected,
    avgVoiceScore: voiceScoreCount > 0 ? totalVoiceScore / voiceScoreCount : null
  };

  return { topics, global };
}

export async function computeAnalyticsSuggestions(): Promise<{
  summary: AnalyticsSummary;
  config: PipelineConfig;
  suggestions: AnalyticsSuggestion[];
}> {
  const [summary, config, ledger, resources] = await Promise.all([
    computeAnalyticsSummary(),
    loadPipelineConfig(),
    loadLedger(),
    loadResources()
  ]);

  const suggestions: AnalyticsSuggestion[] = [];

  // Suggest threshold tweaks based on global average voiceScore
  if (summary.global.avgVoiceScore !== null) {
    const avg = summary.global.avgVoiceScore;
    const current = config.autoPublishThreshold;

    // If average voiceScore is well above threshold, suggest raising it slightly
    if (avg > current + 0.1) {
      suggestions.push({
        id: 'threshold-raise',
        type: 'threshold',
        message: `Average contribution voice score (${avg.toFixed(
          2
        )}) is higher than the auto-publish threshold (${current.toFixed(
          2
        )}). Consider tightening auto-approval.`,
        details: { avgVoiceScore: avg, currentThreshold: current },
        recommendedChange: {
          configKey: 'autoPublishThreshold',
          newValue: Math.min(0.95, +(current + 0.05).toFixed(2))
        }
      });
    }

    // If average score is far below threshold, suggest loosening it slightly
    if (avg < current - 0.1) {
      suggestions.push({
        id: 'threshold-lower',
        type: 'threshold',
        message: `Average contribution voice score (${avg.toFixed(
          2
        )}) is below the auto-publish threshold (${current.toFixed(
          2
        )}). Consider loosening auto-approval.`,
        details: { avgVoiceScore: avg, currentThreshold: current },
        recommendedChange: {
          configKey: 'autoPublishThreshold',
          newValue: Math.max(0.5, +(current - 0.05).toFixed(2))
        }
      });
    }
  }

  // Suggest starter blocks for topics with many rejections
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

