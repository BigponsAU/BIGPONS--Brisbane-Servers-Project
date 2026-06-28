import { describe, expect, it } from 'vitest';
import type { Resource } from '../src/lib/resource-types';
import { getPublicSearchResultPath, getPublicSearchResultUrl } from '../src/lib/search/search-result-url';

function resource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'professional-services-topic-1',
    industry: 'professional-services',
    topic: 'client-management-systems',
    title: 'Client Management Systems Guide',
    description: 'A substantive guide for professional services firms.',
    content: 'word '.repeat(200),
    generatedAt: '2026-01-01T00:00:00.000Z',
    generatedBy: 'editor@example.com',
    version: 1,
    status: 'published',
    visibility: 'public',
    metadata: { wordCount: 200, voiceScore: 0.85 },
    ...overrides,
  };
}

describe('getPublicSearchResultPath', () => {
  it('maps indexable resources to item detail pages', () => {
    expect(getPublicSearchResultPath(resource())).toBe(
      '/resources/item/professional-services-topic-1',
    );
  });

  it('maps corpus case-study mirrors to static case study pages', () => {
    expect(
      getPublicSearchResultPath(
        resource({
          id: 'case-study-retail-pos-modernisation',
          generatedBy: 'system-seed',
          metadata: { growthKind: 'case_study', wordCount: 400, voiceScore: 0.9 },
        }),
      ),
    ).toBe('/case-studies/retail-pos-modernisation');
  });

  it('returns null for non-indexable thin drafts', () => {
    expect(
      getPublicSearchResultPath(
        resource({
          status: 'draft',
          content: 'short',
          metadata: { wordCount: 3, voiceScore: 0.5 },
        }),
      ),
    ).toBeNull();
  });
});

describe('getPublicSearchResultUrl', () => {
  it('adds index.html suffix for search index compatibility', () => {
    expect(getPublicSearchResultUrl(resource())).toBe(
      '/resources/item/professional-services-topic-1/index.html',
    );
  });
});
