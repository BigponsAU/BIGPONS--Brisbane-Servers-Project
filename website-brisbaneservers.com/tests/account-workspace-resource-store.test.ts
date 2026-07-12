import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearWorkspaceResources,
  getWorkspaceResourceById,
  getWorkspaceResources,
  removeWorkspaceResource,
  setWorkspaceResources,
  upsertWorkspaceResource,
} from '../src/scripts/account-workspace-resource-store';

describe('workspace resource store', () => {
  beforeEach(() => {
    clearWorkspaceResources();
  });

  it('keeps durable by-id lookup after a filtered list replace', () => {
    setWorkspaceResources([
      { id: 'draft-1', status: 'draft', title: 'Draft' },
      { id: 'live-1', status: 'published', title: 'Live' },
    ]);

    // Simulate status=draft filter reload wiping the list snapshot
    setWorkspaceResources([{ id: 'draft-1', status: 'draft', title: 'Draft' }]);

    expect(getWorkspaceResources()).toHaveLength(1);
    expect(getWorkspaceResourceById('live-1')).toEqual({
      id: 'live-1',
      status: 'published',
      title: 'Live',
    });
  });

  it('upserts a newly created resource before list reload', () => {
    upsertWorkspaceResource({ id: 'new-1', status: 'draft', title: 'Fresh' });
    expect(getWorkspaceResourceById<{ id: string; title: string }>('new-1')?.title).toBe('Fresh');
    expect(getWorkspaceResources()).toHaveLength(1);
  });

  it('removes hard-deleted resources from the index', () => {
    setWorkspaceResources([{ id: 'gone-1', status: 'draft' }]);
    removeWorkspaceResource('gone-1');
    expect(getWorkspaceResourceById('gone-1')).toBeUndefined();
    expect(getWorkspaceResources()).toHaveLength(0);
  });
});
