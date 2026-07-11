import { describe, expect, it } from 'vitest';
import { hasWorkspaceAccess, roleRank } from '../src/lib/workspace-access';

describe('admin users workspace helpers', () => {
  it('grants workspace to editors and admins even when the flag is false', () => {
    expect(hasWorkspaceAccess({ role: 'admin', workspaceEnabled: false })).toBe(true);
    expect(hasWorkspaceAccess({ role: 'editor', workspaceEnabled: false })).toBe(true);
    expect(hasWorkspaceAccess({ role: 'client', workspaceEnabled: false })).toBe(false);
    expect(hasWorkspaceAccess({ role: 'client', workspaceEnabled: true })).toBe(true);
  });

  it('ranks admin above editor', () => {
    expect(roleRank('admin')).toBeGreaterThan(roleRank('editor'));
  });

  it('treats removedAt as soft-removal signal', () => {
    const isRemoved = (user: { removedAt?: string | null }) => Boolean(user.removedAt);
    expect(isRemoved({ removedAt: null })).toBe(false);
    expect(isRemoved({ removedAt: '2026-07-12T00:00:00.000Z' })).toBe(true);
  });
});
