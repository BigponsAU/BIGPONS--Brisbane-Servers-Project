/**
 * Materialize curated topic guides + industry overviews into the API resource corpus.
 */

import { industries } from '../data/industries';
import {
  getIndustryOverviewGuide,
  getTopicGuide,
  topicGuideToPlainText,
} from '../data/topic-guides';
import { loadResources, saveResources, type Resource } from './resources-api';

const TOPIC_GUIDE_PREFIX = 'topic-guide-';
const GUIDE_SEED_ACTOR = 'system-seed';

function buildGuideContent(industrySlug: string, topicSlug: string): string | null {
  const guide = getTopicGuide(industrySlug, topicSlug);
  if (!guide) return null;
  return topicGuideToPlainText(guide);
}

function buildOverviewContent(industrySlug: string): string | null {
  const guide = getIndustryOverviewGuide(industrySlug);
  if (!guide) return null;
  return topicGuideToPlainText(guide);
}

export function topicGuideToResource(params: {
  industrySlug: string;
  topicSlug: string;
  title: string;
  description: string;
  content: string;
  isOverview?: boolean;
}): Resource {
  const { industrySlug, topicSlug, title, description, content, isOverview } = params;
  const id = isOverview
    ? `${TOPIC_GUIDE_PREFIX}${industrySlug}-overview`
    : `${TOPIC_GUIDE_PREFIX}${industrySlug}-${topicSlug}`;
  return {
    id,
    industry: industrySlug,
    topic: isOverview ? 'overview' : topicSlug,
    title,
    description,
    content,
    generatedAt: '2024-06-01T00:00:00.000Z',
    generatedBy: GUIDE_SEED_ACTOR,
    ownerId: 'system',
    version: 1,
    status: 'published',
    visibility: 'public',
    isStarterBlock: false,
    metadata: {
      wordCount: content.split(/\s+/).filter(Boolean).length,
      growthKind: undefined,
    },
    processingStatus: 'queued',
  };
}

export function isTopicGuideCorpusResource(resource: Resource): boolean {
  return (
    resource.id.startsWith(TOPIC_GUIDE_PREFIX) &&
    resource.generatedBy === GUIDE_SEED_ACTOR &&
    resource.status === 'published'
  );
}

export interface SyncTopicGuidesResult {
  resources: Resource[];
  added: number;
  updated: number;
  totalGuides: number;
}

/**
 * Upsert published topic guides and industry overviews into Neon/filesystem corpus.
 */
export async function syncTopicGuidesToResources(
  resources?: Resource[]
): Promise<SyncTopicGuidesResult> {
  const list = resources ?? (await loadResources());
  const byId = new Map(list.map((r) => [r.id, r]));
  let added = 0;
  let updated = 0;
  let totalGuides = 0;

  for (const industry of industries) {
    const overviewContent = buildOverviewContent(industry.slug);
    if (overviewContent) {
      totalGuides += 1;
      const next = topicGuideToResource({
        industrySlug: industry.slug,
        topicSlug: 'overview',
        title: `${industry.name} — industry overview`,
        description: industry.description,
        content: overviewContent,
        isOverview: true,
      });
      const existing = byId.get(next.id);
      if (!existing) {
        list.push(next);
        byId.set(next.id, next);
        added += 1;
      } else if (isTopicGuideCorpusResource(existing) && existing.content !== next.content) {
        const idx = list.findIndex((r) => r.id === next.id);
        if (idx >= 0) {
          list[idx] = { ...existing, ...next, version: (existing.version || 1) + 1 };
          updated += 1;
        }
      }
    }

    for (const topic of industry.topics) {
      const content = buildGuideContent(industry.slug, topic.slug);
      if (!content) continue;
      totalGuides += 1;
      const next = topicGuideToResource({
        industrySlug: industry.slug,
        topicSlug: topic.slug,
        title: topic.name,
        description: topic.description,
        content,
      });
      const existing = byId.get(next.id);
      if (!existing) {
        list.push(next);
        byId.set(next.id, next);
        added += 1;
      } else if (isTopicGuideCorpusResource(existing) && existing.content !== next.content) {
        const idx = list.findIndex((r) => r.id === next.id);
        if (idx >= 0) {
          list[idx] = { ...existing, ...next, version: (existing.version || 1) + 1 };
          updated += 1;
        }
      }
    }
  }

  if (added > 0 || updated > 0) {
    await saveResources(list);
  }

  return { resources: list, added, updated, totalGuides };
}
