import type { Resource } from '../../lib/resource-types';
import type { IndustryOverviewGuide, TopicGuide } from './types';

/** Phrases from the legacy generic seed template — not shown when a curated guide exists. */
const LEGACY_SEED_MARKERS = [
  'Improve operational efficiency',
  'Enhance customer experience',
  'Reduce manual errors and administrative burden',
  '## Key Benefits',
];

export function isSubstantiveApiResource(resource: Resource): boolean {
  const score = resource.metadata?.voiceScore;
  if (typeof score === 'number' && score < 0.7) {
    return false;
  }
  if (resource.generatedBy === 'system-seed') {
    return false;
  }
  const content = resource.content ?? '';
  if (LEGACY_SEED_MARKERS.some((m) => content.includes(m))) {
    return false;
  }
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (wordCount < 120) {
    return false;
  }
  if (typeof score === 'number' && score >= 0.75) {
    return true;
  }
  return wordCount >= 250;
}

/** Alias used by SEO/sitemap code — same gate as substantive API resources. */
export function isIndexableApiResource(resource: Resource): boolean {
  return isSubstantiveApiResource(resource);
}

import { professionalServicesGuides } from './professional-services';
import { retailGuides } from './retail';
import { healthcareGuides } from './healthcare';
import { hospitalityGuides } from './hospitality';
import { constructionGuides } from './construction';
import { financeGuides } from './finance';
import { manufacturingGuides } from './manufacturing';
import { industryOverviewGuides } from './industry-overviews';

const allTopicGuides: TopicGuide[] = [
  ...professionalServicesGuides,
  ...retailGuides,
  ...healthcareGuides,
  ...hospitalityGuides,
  ...constructionGuides,
  ...financeGuides,
  ...manufacturingGuides,
];

const topicGuideKey = (industrySlug: string, topicSlug: string) => `${industrySlug}/${topicSlug}`;

const topicGuideMap = new Map<string, TopicGuide>(
  allTopicGuides.map((g) => [topicGuideKey(g.industrySlug, g.topicSlug), g]),
);

const industryOverviewMap = new Map<string, IndustryOverviewGuide>(
  industryOverviewGuides.map((g) => [g.industrySlug, g]),
);

export function getTopicGuide(industrySlug: string, topicSlug: string): TopicGuide | undefined {
  return topicGuideMap.get(topicGuideKey(industrySlug, topicSlug));
}

export function getIndustryOverviewGuide(industrySlug: string): IndustryOverviewGuide | undefined {
  return industryOverviewMap.get(industrySlug);
}

/** Flatten guide to plain text for API seeding / legacy consumers. */
export function topicGuideToPlainText(guide: TopicGuide | IndustryOverviewGuide): string {
  const parts: string[] = [guide.proposition, ''];

  for (const section of guide.sections) {
    parts.push(`## ${section.title}`, '');
    parts.push(...section.paragraphs);
    if (section.bullets?.length) {
      parts.push('');
      for (const b of section.bullets) {
        parts.push(`- ${b}`);
      }
    }
    parts.push('');
  }

  parts.push('## Practical next steps', '');
  for (const action of guide.nextActions) {
    parts.push(`${action.label}: ${action.detail}`);
  }

  return parts.join('\n').trim();
}

export type { IndustryOverviewGuide, TopicGuide, TopicGuideSection } from './types';
