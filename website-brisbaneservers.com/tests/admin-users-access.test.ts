import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

  it('admin users script wires remove, restore, and auth-audit pager', () => {
    const src = readFileSync(
      resolve(__dirname, '../src/scripts/account-admin-users.ts'),
      'utf8'
    );
    expect(src).toContain('admin-users-remove-btn');
    expect(src).toContain("action: 'restore'");
    expect(src).toContain('admin-auth-audit-prev-btn');
    expect(src).toContain('admin-auth-audit-next-btn');
    expect(src).toContain('includeRemoved=1');
    expect(src).not.toContain('window.alert');
  });
});
