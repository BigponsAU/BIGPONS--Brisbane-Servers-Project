/**
 * Registry and validation for indexable public content.
 * Keeps sitemap paths and SEO requirements aligned when new guides, studies, or resources are added.
 */
import { caseStudies, type CaseStudy } from '../data/case-studies';
import { industries } from '../data/industries';
import { getTopicGuide, isSubstantiveApiResource } from '../data/topic-guides';
import type { Resource } from './resource-types';
import { isPublicResource } from './resource-types';
import { toSitemapLastmod } from './seo';

export type SitemapContentEntry = {
  path: string;
  lastmod?: string;
  source: 'static' | 'case-study' | 'industry-hub' | 'topic-guide' | 'api-resource';
};

export type ContentSeoIssue = {
  id: string;
  message: string;
  severity: 'error' | 'warning';
};

const STATIC_MARKETING_PATHS = [
  '/',
  '/about',
  '/brisbane-2032',
  '/services',
  '/resources',
  '/projects',
  '/contribute',
  '/privacy-policy',
  '/terms-of-service',
  '/case-studies',
] as const;

/** Resources eligible for prerendered detail pages and sitemap inclusion. */
export function isIndexableResource(resource: Resource): boolean {
  return isPublicResource(resource) && isSubstantiveApiResource(resource);
}

export function getStaticMarketingPaths(): string[] {
  return [...STATIC_MARKETING_PATHS];
}

export function getCaseStudyPaths(): string[] {
  return caseStudies.map((study) => `/case-studies/${study.slug}`);
}

export function getIndustryHubPaths(): string[] {
  return industries.map((industry) => `/resources/${industry.slug}`);
}

export function getTopicGuidePaths(): string[] {
  const paths: string[] = [];
  for (const industry of industries) {
    for (const topic of industry.topics) {
      paths.push(`/resources/${industry.slug}/${topic.slug}`);
    }
  }
  return paths;
}

export function getIndexableResourcePath(resource: Resource): string {
  return `/resources/item/${resource.id}`;
}

export function buildStaticSitemapEntries(
  buildLastmod: string,
  publishedResources: Resource[] = [],
): SitemapContentEntry[] {
  const entries = new Map<string, SitemapContentEntry>();

  for (const path of getStaticMarketingPaths()) {
    entries.set(path, { path, lastmod: buildLastmod, source: 'static' });
  }

  for (const path of getCaseStudyPaths()) {
    entries.set(path, { path, lastmod: buildLastmod, source: 'case-study' });
  }

  for (const path of getIndustryHubPaths()) {
    entries.set(path, { path, lastmod: buildLastmod, source: 'industry-hub' });
  }

  for (const path of getTopicGuidePaths()) {
    entries.set(path, { path, lastmod: buildLastmod, source: 'topic-guide' });
  }

  for (const resource of publishedResources.filter(isIndexableResource)) {
    const path = getIndexableResourcePath(resource);
    entries.set(path, {
      path,
      lastmod: toSitemapLastmod(resource.generatedAt) ?? buildLastmod,
      source: 'api-resource',
    });
  }

  return [...entries.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function validateCaseStudySeo(study: CaseStudy, seenSlugs: Set<string>): ContentSeoIssue[] {
  const issues: ContentSeoIssue[] = [];
  const id = `case-study:${study.slug}`;

  if (!study.slug?.trim()) {
    issues.push({ id, message: 'Missing slug', severity: 'error' });
  } else if (seenSlugs.has(study.slug)) {
    issues.push({ id, message: `Duplicate slug "${study.slug}"`, severity: 'error' });
  } else {
    seenSlugs.add(study.slug);
  }

  if (!study.pageTitle?.trim()) {
    issues.push({ id, message: 'Missing pageTitle', severity: 'error' });
  }
  if (!study.metaDescription?.trim()) {
    issues.push({ id, message: 'Missing metaDescription', severity: 'error' });
  }
  if (!study.heroTitle?.trim()) {
    issues.push({ id, message: 'Missing heroTitle', severity: 'error' });
  }
  if (!study.cardTitle?.trim()) {
    issues.push({ id, message: 'Missing cardTitle', severity: 'error' });
  }

  return issues;
}

export function validateStaticContentSeo(): ContentSeoIssue[] {
  const issues: ContentSeoIssue[] = [];
  const caseStudySlugs = new Set<string>();

  for (const study of caseStudies) {
    issues.push(...validateCaseStudySeo(study, caseStudySlugs));
  }

  for (const industry of industries) {
    const industryId = `industry:${industry.slug}`;
    if (!industry.name?.trim()) {
      issues.push({ id: industryId, message: 'Missing industry name', severity: 'error' });
    }
    if (!industry.description?.trim()) {
      issues.push({ id: industryId, message: 'Missing industry description', severity: 'error' });
    }

    for (const topic of industry.topics) {
      const topicId = `topic:${industry.slug}/${topic.slug}`;
      if (!topic.name?.trim()) {
        issues.push({ id: topicId, message: 'Missing topic name', severity: 'error' });
      }
      if (!topic.description?.trim()) {
        issues.push({ id: topicId, message: 'Missing topic description', severity: 'error' });
      }
      if (!getTopicGuide(industry.slug, topic.slug)) {
        issues.push({
          id: topicId,
          message: 'No curated topic guide — page will use thin fallback copy until guide data is added',
          severity: 'warning',
        });
      }
    }
  }

  return issues;
}

export function getTopicGuideCoverage(): Array<{
  industrySlug: string;
  topicSlug: string;
  hasGuide: boolean;
}> {
  const coverage: Array<{ industrySlug: string; topicSlug: string; hasGuide: boolean }> = [];
  for (const industry of industries) {
    for (const topic of industry.topics) {
      coverage.push({
        industrySlug: industry.slug,
        topicSlug: topic.slug,
        hasGuide: Boolean(getTopicGuide(industry.slug, topic.slug)),
      });
    }
  }
  return coverage;
}
