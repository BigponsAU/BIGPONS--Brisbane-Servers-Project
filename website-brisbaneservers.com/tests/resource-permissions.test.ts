import { describe, expect, it } from 'vitest';
import { getResourceActionPermissions } from '../src/lib/resource-permissions';
import type { Resource } from '../src/lib/resource-types';

const baseResource: Resource = {
  id: 'r1',
  title: 'Test',
  industry: 'professional-services',
  topic: 'client-management-systems',
  description: 'Desc',
  content: 'Body',
  status: 'draft',
  version: 1,
  generatedAt: new Date().toISOString(),
  ownerId: 'user-1',
};

describe('getResourceActionPermissions', () => {
  it('allows owner to edit and delete drafts', () => {
    const perms = getResourceActionPermissions({ id: 'user-1', role: 'editor' }, baseResource);
    expect(perms.edit).toBe(true);
    expect(perms.delete).toBe(true);
    expect(perms.publish).toBe(true);
  });

  it('blocks owner delete while published on the public site', () => {
    const published = { ...baseResource, status: 'published' as const };
    const perms = getResourceActionPermissions({ id: 'user-1', role: 'editor' }, published);
    expect(perms.unpublish).toBe(true);
    expect(perms.delete).toBe(false);
    expect(perms.deleteReason).toMatch(/Unpublish/i);
    expect(perms.edit).toBe(true);
  });

  it('allows admin to delete published resources', () => {
    const published = { ...baseResource, status: 'published' as const };
    const perms = getResourceActionPermissions({ id: 'admin-1', role: 'admin' }, published);
    expect(perms.delete).toBe(true);
    expect(perms.restore).toBe(false);
  });

  it('allows admin restore on soft-removed resources', () => {
    const removed = {
      ...baseResource,
      status: 'published' as const,
      portalRemovedAt: new Date().toISOString(),
    };
    const perms = getResourceActionPermissions({ id: 'admin-1', role: 'admin' }, removed);
    expect(perms.restore).toBe(true);
    expect(perms.delete).toBe(false);
  });

  it('protects starter blocks from non-admin edit/delete', () => {
    const starter = { ...baseResource, isStarterBlock: true, ownerId: 'system' };
    const perms = getResourceActionPermissions({ id: 'user-1', role: 'editor' }, starter);
    expect(perms.edit).toBe(false);
    expect(perms.delete).toBe(false);
    expect(perms.editReason).toMatch(/Starter blocks/i);
  });
});
