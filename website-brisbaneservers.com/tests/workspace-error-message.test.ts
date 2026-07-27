import { describe, expect, it } from 'vitest';
import { workspaceErrorMessage } from '../src/scripts/account-workspace-utils';

describe('workspaceErrorMessage', () => {
  it('prefers Error.message', () => {
    expect(workspaceErrorMessage(new Error('profile missing'))).toBe('profile missing');
  });

  it('labels ReferenceError as workspace error', () => {
    expect(workspaceErrorMessage(new ReferenceError('foo is not defined'))).toBe(
      'Workspace error: foo is not defined',
    );
  });

  it('maps fetch TypeErrors to a network message', () => {
    expect(workspaceErrorMessage(new TypeError('Failed to fetch'))).toMatch(/Network error/i);
  });

  it('falls back when empty', () => {
    expect(workspaceErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
