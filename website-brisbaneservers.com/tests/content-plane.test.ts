import { describe, expect, it } from 'vitest';
import {
  getAffectedPublicPaths,
  resolveContent,
  shouldUpdatePublicSurfaces,
} from '../src/lib/content-plane';
import type { Resource } from '../src/lib/resource-types';

function resource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'r1',
    industry: 'healthcare',
    topic: 'compliance',
    title: 'Guide',
    description: 'Desc',
    content: 'Body text long enough for substantive checks when needed.',
    generatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    status: 'draft',
    ownerId: 'user-1',
    ...overrides,
  };
}

describe('content-plane', () => {
  it('draft edits do not update public surfaces', () => {
    const before = resource({ status: 'draft', title: 'A' });
    const after = resource({ status: 'draft', title: 'B' });
    expect(shouldUpdatePublicSurfaces(before, after)).toBe(false);
  });

  it('publish updates public surfaces', () => {
    const before = resource({ status: 'draft' });
    const after = resource({ status: 'published', visibility: 'public' });
    expect(shouldUpdatePublicSurfaces(before, after)).toBe(true);
  });

  it('published field edits update public surfaces', () => {
    const before = resource({ status: 'published', title: 'Old' });
    const after = resource({ status: 'published', title: 'New' });
    expect(shouldUpdatePublicSurfaces(before, after)).toBe(true);
  });

  it('computes affected SEO paths on publish', () => {
    const before = resource({ status: 'draft' });
    const after = resource({ status: 'published', visibility: 'public' });
    const paths = getAffectedPublicPaths(before, after);
    expect(paths).toContain('/resources');
    expect(paths).toContain('/resources/healthcare');
    expect(paths).toContain('/resources/healthcare/compliance');
    expect(paths).toContain('/sitemap.xml');
  });

  it('public plane excludes drafts', () => {
    const all = [
      resource({ id: 'd1', status: 'draft' }),
      resource({ id: 'p1', status: 'published', visibility: 'public' }),
    ];
    const publicOnly = resolveContent(all, { plane: 'public' });
    expect(publicOnly.map((r) => r.id)).toEqual(['p1']);
  });
});
