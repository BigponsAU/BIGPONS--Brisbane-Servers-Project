import { describe, expect, it } from 'vitest';
import {
  isPublicResource,
  isVisibleInPortalWorkspace,
  type Resource,
} from '../src/lib/resource-types';

const published: Resource = {
  id: 'r1',
  title: 'Live guide',
  industry: 'retail',
  topic: 'inventory-pos',
  description: 'Desc',
  content: 'Body',
  status: 'published',
  version: 1,
  generatedAt: new Date().toISOString(),
  ownerId: 'user-1',
  wasEverPublished: true,
};

describe('portal soft-delete vs public index', () => {
  it('keeps published resources in the public catalog after workspace removal', () => {
    const softRemoved = { ...published, portalRemovedAt: new Date().toISOString() };
    expect(isPublicResource(softRemoved)).toBe(true);
    expect(isVisibleInPortalWorkspace(softRemoved)).toBe(false);
  });

  it('shows active published resources in the workspace', () => {
    expect(isPublicResource(published)).toBe(true);
    expect(isVisibleInPortalWorkspace(published)).toBe(true);
  });
});
