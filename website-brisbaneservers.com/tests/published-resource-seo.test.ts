import { describe, expect, it } from 'vitest';
import { validatePublishedResourceSeo } from '../src/lib/content-registry';
import type { Resource } from '../src/lib/resource-types';

function resource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'test-resource',
    industry: 'retail',
    topic: 'inventory-pos',
    title: 'Inventory and POS integration',
    description: 'How retail teams unify stock and checkout without replatforming everything at once.',
    content: 'word '.repeat(150),
    generatedAt: '2026-01-01T00:00:00.000Z',
    generatedBy: 'editor@example.com',
    version: 1,
    status: 'published',
    visibility: 'public',
    metadata: { wordCount: 150, voiceScore: 0.82 },
    ...overrides,
  };
}

describe('validatePublishedResourceSeo', () => {
  it('passes for substantive indexable resources', () => {
    expect(validatePublishedResourceSeo(resource())).toEqual([]);
  });

  it('warns when description is missing', () => {
    const issues = validatePublishedResourceSeo(resource({ description: '' }));
    expect(issues.some((i) => i.message.includes('description'))).toBe(true);
  });

  it('skips non-indexable drafts', () => {
    expect(validatePublishedResourceSeo(resource({ status: 'draft' }))).toEqual([]);
  });
});
