import { describe, expect, it } from 'vitest';
import { filterResourcesForUser } from '../src/lib/resource-access';
import type { Resource } from '../src/lib/resource-types';

const base: Resource = {
  id: 'r1',
  title: 'T',
  industry: 'retail',
  topic: 'pos',
  description: 'd',
  content: 'c',
  status: 'published',
  version: 1,
  generatedAt: new Date().toISOString(),
  ownerId: 'u1',
};

describe('filterResourcesForUser portal visibility', () => {
  it('hides soft-removed resources from default portal lists', () => {
    const removed = { ...base, portalRemovedAt: new Date().toISOString() };
    const list = filterResourcesForUser({ id: 'admin', email: 'a@b.c', role: 'admin' }, [
      base,
      removed,
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('r1');
  });

  it('returns removed-only rows for admin removedOnly filter', () => {
    const removed = { ...base, portalRemovedAt: new Date().toISOString() };
    const list = filterResourcesForUser(
      { id: 'admin', email: 'a@b.c', role: 'admin' },
      [base, removed],
      { removedOnly: true },
    );
    expect(list).toHaveLength(1);
    expect(list[0].portalRemovedAt).toBeTruthy();
  });
});
