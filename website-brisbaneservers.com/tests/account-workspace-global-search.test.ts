import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  GLOBAL_SEARCH_PANEL_ALIASES,
  applyGlobalSearchQuery,
} from '../src/scripts/account-workspace-global-search';

describe('workspace global search', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      setTimeout: (fn: () => void) => {
        fn();
        return 0;
      },
    });
  });

  it('routes panel prefixes and aliases when allowed', () => {
    const navigateToPanel = vi.fn();
    const applyResourceSearchQuery = vi.fn();
    const filterProfileCardsByQuery = vi.fn();
    const canAccessPanel = vi.fn(() => true);

    const deps = { navigateToPanel, applyResourceSearchQuery, filterProfileCardsByQuery, canAccessPanel };

    applyGlobalSearchQuery('panel:voice-lab', deps);
    expect(navigateToPanel).toHaveBeenCalledWith('voice-lab');

    applyGlobalSearchQuery('analytics', deps);
    expect(navigateToPanel).toHaveBeenCalledWith('analytics');
  });

  it('blocks admin panel aliases for users without access', () => {
    const navigateToPanel = vi.fn();
    const applyResourceSearchQuery = vi.fn();
    const filterProfileCardsByQuery = vi.fn();
    const canAccessPanel = vi.fn((panel: string) => panel !== 'admin-users' && panel !== 'admin-ops' && panel !== 'admin-billing');

    applyGlobalSearchQuery('users', {
      navigateToPanel,
      applyResourceSearchQuery,
      filterProfileCardsByQuery,
      canAccessPanel,
    });
    expect(navigateToPanel).not.toHaveBeenCalled();

    applyGlobalSearchQuery('panel:admin-ops', {
      navigateToPanel,
      applyResourceSearchQuery,
      filterProfileCardsByQuery,
      canAccessPanel,
    });
    expect(navigateToPanel).not.toHaveBeenCalled();

    applyGlobalSearchQuery('billing', {
      navigateToPanel,
      applyResourceSearchQuery,
      filterProfileCardsByQuery,
      canAccessPanel,
    });
    expect(navigateToPanel).not.toHaveBeenCalled();
  });

  it('routes resource and profile prefixes', () => {
    const navigateToPanel = vi.fn();
    const applyResourceSearchQuery = vi.fn();
    const filterProfileCardsByQuery = vi.fn();
    const canAccessPanel = vi.fn(() => true);

    applyGlobalSearchQuery('resource:healthcare', {
      navigateToPanel,
      applyResourceSearchQuery,
      filterProfileCardsByQuery,
      canAccessPanel,
    });
    expect(applyResourceSearchQuery).toHaveBeenCalledWith('healthcare');

    applyGlobalSearchQuery('profile:brisbane', {
      navigateToPanel,
      applyResourceSearchQuery,
      filterProfileCardsByQuery,
      canAccessPanel,
    });
    expect(navigateToPanel).toHaveBeenCalledWith('profiles');
    expect(filterProfileCardsByQuery).toHaveBeenCalledWith('brisbane');
  });

  it('blocks profile/voice prefixes without capability', () => {
    const navigateToPanel = vi.fn();
    const applyResourceSearchQuery = vi.fn();
    const filterProfileCardsByQuery = vi.fn();
    const canAccessPanel = vi.fn(() => false);

    applyGlobalSearchQuery('profile:brisbane', {
      navigateToPanel,
      applyResourceSearchQuery,
      filterProfileCardsByQuery,
      canAccessPanel,
    });
    expect(navigateToPanel).not.toHaveBeenCalled();

    applyGlobalSearchQuery('voice:hello', {
      navigateToPanel,
      applyResourceSearchQuery,
      filterProfileCardsByQuery,
      canAccessPanel,
    });
    expect(navigateToPanel).not.toHaveBeenCalled();
  });

  it('exposes panel aliases used by docs', () => {
    expect(GLOBAL_SEARCH_PANEL_ALIASES.voicelab).toBe('voice-lab');
    expect(GLOBAL_SEARCH_PANEL_ALIASES.billing).toBe('admin-billing');
  });
});
