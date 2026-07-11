import { describe, expect, it } from 'vitest';
import {
  isBinnedResource,
  isPublicResource,
  isVisibleInPortalWorkspace,
  type Resource,
} from '../src/lib/resource-types';
import { getResourceActionPermissions } from '../src/lib/resource-permissions';
import { filterResourcesForUser } from '../src/lib/resource-access';

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

const draft: Resource = {
  id: 'r2',
  title: 'Draft guide',
  industry: 'retail',
  topic: 'inventory-pos',
  description: 'Desc',
  content: 'Body',
  status: 'draft',
  version: 1,
  generatedAt: new Date().toISOString(),
  ownerId: 'user-1',
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

describe('bin drafts for collation', () => {
  it('hides binned drafts from the active workspace but keeps them as drafts', () => {
    const binned = { ...draft, binnedAt: new Date().toISOString(), status: 'draft' as const };
    expect(isBinnedResource(binned)).toBe(true);
    expect(isVisibleInPortalWorkspace(binned)).toBe(false);
    expect(isPublicResource(binned)).toBe(false);
    expect(binned.status).toBe('draft');
  });

  it('lets owners restore bin drafts', () => {
    const binned = { ...draft, binnedAt: new Date().toISOString() };
    const perms = getResourceActionPermissions({ id: 'user-1', role: 'editor' }, binned);
    expect(perms.restore).toBe(true);
    expect(perms.delete).toBe(false);
    expect(perms.edit).toBe(false);
  });

  it('filters binnedOnly for owners', () => {
    const binned = { ...draft, binnedAt: new Date().toISOString() };
    const user = { id: 'user-1', role: 'editor', email: 'a@b.c', name: 'A' } as any;
    const only = filterResourcesForUser(user, [draft, binned, published], { binnedOnly: true });
    expect(only.map((r) => r.id)).toEqual(['r2']);
  });
});
