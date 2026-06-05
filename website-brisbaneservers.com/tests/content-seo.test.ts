import { describe, expect, it } from 'vitest';
import { caseStudies } from '../src/data/case-studies';
import { industries } from '../src/data/industries';
import { topicGuidePageTitle, topicGuideSeo } from '../src/lib/content-seo';
import {
  buildStaticSitemapEntries,
  getCaseStudyPaths,
  getTopicGuidePaths,
  validateStaticContentSeo,
} from '../src/lib/content-registry';

const SITE = 'https://brisbaneservers.com';

describe('content-seo helpers', () => {
  it('builds topic guide SEO with breadcrumbs and article schema', () => {
    const industry = industries.find((item) => item.slug === 'healthcare')!;
    const topic = industry.topics[0];
    const seo = topicGuideSeo(industry, topic, 'Test headline', SITE);

    expect(seo.breadcrumbs).toHaveLength(4);
    expect(seo.structuredData.some((node) => node['@type'] === 'TechArticle')).toBe(true);
    expect(seo.structuredData.some((node) => node['@type'] === 'BreadcrumbList')).toBe(true);
    expect(topicGuidePageTitle(topic, industry)).toContain(topic.name);
  });
});

describe('content registry', () => {
  it('includes case studies and topic guides in sitemap entries', () => {
    const entries = buildStaticSitemapEntries('2026-05-24');
    const paths = entries.map((entry) => entry.path);

    expect(paths).toEqual(expect.arrayContaining(getCaseStudyPaths()));
    expect(paths).toEqual(expect.arrayContaining(getTopicGuidePaths()));
    expect(paths).toEqual(expect.arrayContaining(['/case-studies', '/brisbane-2032']));
  });

  it('passes validation for current static content', () => {
    const issues = validateStaticContentSeo();
    const errors = issues.filter((issue) => issue.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('requires SEO fields on case studies', () => {
    const study = caseStudies[0];
    const issues = validateStaticContentSeo();
    expect(issues.some((issue) => issue.id === `case-study:${study.slug}` && issue.severity === 'error')).toBe(
      false,
    );
  });
});
