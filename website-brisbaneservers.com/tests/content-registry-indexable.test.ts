import { describe, expect, it } from 'vitest';
import { isIndexableResource } from '../src/lib/content-registry';
import type { Resource } from '../src/lib/resource-types';

function resource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'r1',
    industry: 'healthcare',
    topic: 'compliance',
    title: 'Guide',
    description: 'Desc',
    content: 'x '.repeat(200),
    generatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    status: 'published',
    visibility: 'public',
    metadata: { wordCount: 350 },
    ...overrides,
  };
}

describe('isIndexableResource', () => {
  it('indexes published starter blocks with sufficient body', () => {
    const starter = resource({
      isStarterBlock: true,
      visibility: 'starter',
      content: '## Key Benefits\nImprove operational efficiency\n'.repeat(20),
    });
    expect(isIndexableResource(starter)).toBe(true);
  });

  it('excludes drafts', () => {
    expect(isIndexableResource(resource({ status: 'draft' }))).toBe(false);
  });

  it('requires substantive user content when not a starter block', () => {
    const thin = resource({
      isStarterBlock: false,
      content: 'too short',
      metadata: { wordCount: 10, voiceScore: 0.5 },
    });
    expect(isIndexableResource(thin)).toBe(false);
  });
});
