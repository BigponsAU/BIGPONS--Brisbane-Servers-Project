/**
 * Unified SEO for all public content types — case studies, topic guides, and API resources.
 * New entries should use these helpers so titles, breadcrumbs, and JSON-LD stay consistent.
 */
import type { CaseStudy } from '../data/case-studies';
import type { Industry, Topic } from '../data/industries';
import { getTopicBySlug } from '../data/industries';
import type { Resource } from './resource-types';
import {
  buildArticleJsonLd,
  buildBreadcrumbListJsonLd,
  buildCanonicalUrl,
  type BreadcrumbItem,
} from './seo';
import { normalizeTopicSlug } from './resource-slug';

export const HOME_CRUMB: BreadcrumbItem = { label: 'Home', href: '/' };
export const RESOURCES_CRUMB: BreadcrumbItem = { label: 'Resources', href: '/resources' };
export const CASE_STUDIES_CRUMB: BreadcrumbItem = { label: 'Case studies', href: '/case-studies' };

export type ContentPageSeoOptions = {
  path: string;
  siteOrigin: string;
  baseUrl?: string;
  breadcrumbs: BreadcrumbItem[];
  headline: string;
  description: string;
  articleSection?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  collectionItems?: Array<{ name: string; path: string }>;
};

export type ContentPageSeoResult = {
  canonicalUrl: string;
  structuredData: Record<string, unknown>[];
  breadcrumbs: BreadcrumbItem[];
};

export function buildContentPageSeo(options: ContentPageSeoOptions): ContentPageSeoResult {
  const baseUrl = options.baseUrl ?? '/';
  const canonicalUrl = buildCanonicalUrl(options.path, options.siteOrigin, baseUrl);
  const structuredData: Record<string, unknown>[] = [
    buildBreadcrumbListJsonLd(options.breadcrumbs, options.siteOrigin, baseUrl),
    buildArticleJsonLd({
      headline: options.headline,
      description: options.description,
      url: canonicalUrl,
      datePublished: options.datePublished,
      dateModified: options.dateModified,
      authorName: options.authorName,
      articleSection: options.articleSection,
    }),
  ];

  if (options.collectionItems?.length) {
    structuredData.push({
      '@type': 'CollectionPage',
      name: options.headline,
      description: options.description,
      url: canonicalUrl,
      hasPart: options.collectionItems.map((item) => ({
        '@type': 'WebPage',
        name: item.name,
        url: buildCanonicalUrl(item.path, options.siteOrigin, baseUrl),
      })),
    });
  }

  return {
    canonicalUrl,
    structuredData,
    breadcrumbs: options.breadcrumbs,
  };
}

export function caseStudyDetailSeo(
  study: CaseStudy,
  siteOrigin: string,
  baseUrl = '/',
): ContentPageSeoResult {
  return buildContentPageSeo({
    path: `/case-studies/${study.slug}`,
    siteOrigin,
    baseUrl,
    breadcrumbs: [HOME_CRUMB, CASE_STUDIES_CRUMB, { label: study.cardTitle }],
    headline: study.heroTitle,
    description: study.metaDescription,
    articleSection: 'Case studies',
  });
}

export function caseStudiesHubSeo(
  studies: CaseStudy[],
  siteOrigin: string,
  baseUrl = '/',
  description: string,
): ContentPageSeoResult {
  return buildContentPageSeo({
    path: '/case-studies',
    siteOrigin,
    baseUrl,
    breadcrumbs: [HOME_CRUMB, { label: 'Case studies' }],
    headline: 'Case studies',
    description,
    articleSection: 'Case studies',
    collectionItems: studies.map((study) => ({
      name: study.cardTitle,
      path: `/case-studies/${study.slug}`,
    })),
  });
}

export function resourcesHubSeo(
  industryList: Industry[],
  siteOrigin: string,
  baseUrl: string,
  description: string,
): ContentPageSeoResult {
  return buildContentPageSeo({
    path: '/resources',
    siteOrigin,
    baseUrl,
    breadcrumbs: [HOME_CRUMB, { label: 'Resources' }],
    headline: 'Resources and insights',
    description,
    articleSection: 'Resources',
    collectionItems: industryList.map((industry) => ({
      name: industry.name,
      path: `/resources/${industry.slug}`,
    })),
  });
}

export function industryHubSeo(
  industry: Industry,
  headline: string,
  siteOrigin: string,
  baseUrl = '/',
): ContentPageSeoResult {
  return buildContentPageSeo({
    path: `/resources/${industry.slug}`,
    siteOrigin,
    baseUrl,
    breadcrumbs: [HOME_CRUMB, RESOURCES_CRUMB, { label: industry.name }],
    headline,
    description: industry.description,
    articleSection: industry.name,
    collectionItems: industry.topics.map((topic) => ({
      name: topic.name,
      path: `/resources/${industry.slug}/${topic.slug}`,
    })),
  });
}

export function topicGuideSeo(
  industry: Industry,
  topic: Topic,
  headline: string,
  siteOrigin: string,
  baseUrl = '/',
): ContentPageSeoResult {
  return buildContentPageSeo({
    path: `/resources/${industry.slug}/${topic.slug}`,
    siteOrigin,
    baseUrl,
    breadcrumbs: [
      HOME_CRUMB,
      RESOURCES_CRUMB,
      { label: industry.name, href: `/resources/${industry.slug}` },
      { label: topic.name },
    ],
    headline,
    description: topic.description,
    articleSection: industry.name,
  });
}

export function publishedResourceSeo(
  resource: Resource,
  siteOrigin: string,
  baseUrl = '/',
  industryName?: string,
): ContentPageSeoResult {
  const topicRecord = getTopicBySlug(resource.industry, resource.topic);
  const topicLabel = topicRecord?.name ?? resource.topic;
  const breadcrumbs: BreadcrumbItem[] = [
    HOME_CRUMB,
    RESOURCES_CRUMB,
    ...(industryName
      ? [{ label: industryName, href: `/resources/${resource.industry}` }]
      : []),
    ...(resource.topic && resource.industry
      ? [{ label: topicLabel, href: `/resources/${resource.industry}/${normalizeTopicSlug(resource.topic)}` }]
      : []),
    { label: resource.title },
  ];

  return buildContentPageSeo({
    path: `/resources/item/${resource.id}`,
    siteOrigin,
    baseUrl,
    breadcrumbs,
    headline: resource.title,
    description: resource.description,
    datePublished: resource.generatedAt,
    dateModified: resource.generatedAt,
    authorName: resource.generatedBy ?? 'Brisbane Servers',
    articleSection: industryName,
  });
}

/** Standard title for a topic guide page (before `formatPageTitle` in BaseLayout). */
export function topicGuidePageTitle(topic: Topic, industry: Industry): string {
  return `${topic.name} — ${industry.name} resources`;
}

/** Standard title for a published resource detail page. */
export function publishedResourcePageTitle(resource: Resource): string {
  return resource.title;
}
