/**
 * Ensure industry starter blocks exist in the corpus and carry isStarterBlock: true.
 * Production Postgres may have published guides without the flag after migration.
 */

import { industries } from '../data/industries';
import type { Industry } from '../data/industries';
import {
  loadResources,
  normalizeTopicSlug,
  saveResources,
  topicsMatch,
  type Resource,
} from './resources-api';
import {
  syncInferenceMetaStarterToResources,
  type SyncInferenceMetaStarterResult,
} from './inference-meta-starter-corpus';

/** Batch id suffix for canonical industry/topic starter templates. */
export const STARTER_BLOCK_BATCH_SUFFIX = '1769301663783';

const STARTER_SEED_ACTOR = 'system-seed';

function generateStarterContent(industry: Industry, topic: { name: string; description: string }): string {
  const industryName = industry.name;
  const topicName = topic.name;
  const topicDescription = topic.description;

  return `${topicName} for ${industryName}

${topicDescription}

## Overview

${topicName} is a critical component for ${industryName.toLowerCase()} businesses. This resource provides practical guidance, real-world examples, and actionable strategies tailored specifically to the ${industryName.toLowerCase()} context in Australia.

## Key Benefits

Implementing effective ${topicName.toLowerCase()} solutions can help ${industryName.toLowerCase()} businesses:

- Improve operational efficiency
- Enhance customer experience
- Reduce manual errors and administrative burden
- Gain better insights through data and analytics
- Scale operations more effectively

## Getting Started

To begin exploring ${topicName.toLowerCase()} solutions for your ${industryName.toLowerCase()} business:

1. Document your current processes and identify specific challenges
2. Research solutions that are proven to work in ${industryName.toLowerCase()} contexts
3. Consider consulting with technology experts who understand your industry
4. Start with a pilot or small-scale implementation
5. Measure results and iterate based on feedback`;
}

export function canonicalStarterBlockId(industrySlug: string, topicSlug: string): string {
  return `${industrySlug}-${normalizeTopicSlug(topicSlug)}-${STARTER_BLOCK_BATCH_SUFFIX}`;
}

export function isCanonicalIndustryStarterResource(resource: Resource): boolean {
  return (
    resource.id.endsWith(`-${STARTER_BLOCK_BATCH_SUFFIX}`) &&
    !resource.id.startsWith('topic-guide-')
  );
}

function applyStarterBlockFields(resource: Resource): Resource {
  return {
    ...resource,
    isStarterBlock: true,
    visibility: 'starter',
    status: 'published',
    ownerId: undefined,
    portalRemovedAt: undefined,
  };
}

function buildIndustryStarterResource(industry: Industry, topic: { slug: string; name: string; description: string }): Resource {
  const topicSlug = normalizeTopicSlug(topic.slug);
  const content = generateStarterContent(industry, topic);
  return applyStarterBlockFields({
    id: canonicalStarterBlockId(industry.slug, topicSlug),
    industry: industry.slug,
    topic: topicSlug,
    title: `${topic.name} for ${industry.name}`,
    description: topic.description,
    content,
    generatedAt: '2026-01-25T00:41:03.783Z',
    generatedBy: STARTER_SEED_ACTOR,
    version: 1,
    status: 'published',
    metadata: {
      wordCount: content.split(/\s+/).filter(Boolean).length,
      semanticLevel: 'medium',
      voiceScore: 0.75,
    },
    processingStatus: 'queued',
  });
}

function buildIndustryOverviewStarter(industry: Industry): Resource {
  const content = generateStarterContent(industry, {
    name: `${industry.name} Overview`,
    description: industry.description,
  });
  return applyStarterBlockFields({
    id: `${industry.slug}-overview-${STARTER_BLOCK_BATCH_SUFFIX}`,
    industry: industry.slug,
    topic: 'overview',
    title: `${industry.name} - Technology Solutions Overview`,
    description: industry.description,
    content,
    generatedAt: '2026-01-25T00:41:03.783Z',
    generatedBy: STARTER_SEED_ACTOR,
    version: 1,
    status: 'published',
    metadata: {
      wordCount: content.split(/\s+/).filter(Boolean).length,
      semanticLevel: 'medium',
      voiceScore: 0.75,
    },
    processingStatus: 'queued',
  });
}

export interface SyncStarterBlockCorpusResult extends SyncInferenceMetaStarterResult {
  flagsRepaired: number;
  industryStartersAdded: number;
  industryStartersUpdated: number;
}

/**
 * Upsert inference meta starter, repair isStarterBlock flags, and ensure industry templates exist.
 */
export async function syncStarterBlockCorpus(
  resources?: Resource[],
): Promise<SyncStarterBlockCorpusResult> {
  let list = resources ?? (await loadResources());
  let flagsRepaired = 0;
  let industryStartersAdded = 0;
  let industryStartersUpdated = 0;

  const meta = await syncInferenceMetaStarterToResources(list);
  list = meta.resources;

  for (let i = 0; i < list.length; i += 1) {
    const r = list[i];
    const shouldBeStarter =
      r.visibility === 'starter' ||
      isCanonicalIndustryStarterResource(r) ||
      (r.isStarterBlock === true && !r.ownerId);

    if (shouldBeStarter && r.isStarterBlock !== true) {
      list[i] = applyStarterBlockFields(r);
      flagsRepaired += 1;
    }
  }

  for (const industry of industries) {
    if (industry.topics.length === 0) {
      const id = `${industry.slug}-overview-${STARTER_BLOCK_BATCH_SUFFIX}`;
      const idx = list.findIndex((r) => r.id === id);
      const seed = buildIndustryOverviewStarter(industry);
      if (idx < 0) {
        list.push(seed);
        industryStartersAdded += 1;
      } else if (!list[idx].isStarterBlock) {
        list[idx] = { ...list[idx], ...seed, version: (list[idx].version ?? 1) + 1 };
        industryStartersUpdated += 1;
      }
      continue;
    }

    for (const topic of industry.topics) {
      const id = canonicalStarterBlockId(industry.slug, topic.slug);
      const idx = list.findIndex((r) => r.id === id);
      const existingByTopic = list.findIndex(
        (r) => r.industry === industry.slug && topicsMatch(r.topic, topic.slug) && r.isStarterBlock === true,
      );

      if (idx >= 0) {
        if (!list[idx].isStarterBlock) {
          list[idx] = applyStarterBlockFields({ ...list[idx], ...buildIndustryStarterResource(industry, topic) });
          industryStartersUpdated += 1;
        }
        continue;
      }

      if (existingByTopic >= 0) {
        continue;
      }

      list.push(buildIndustryStarterResource(industry, topic));
      industryStartersAdded += 1;
    }
  }

  const changed =
    meta.added ||
    meta.updated ||
    flagsRepaired > 0 ||
    industryStartersAdded > 0 ||
    industryStartersUpdated > 0;

  if (changed) {
    await saveResources(list);
  }

  return {
    ...meta,
    flagsRepaired,
    industryStartersAdded,
    industryStartersUpdated,
  };
}
