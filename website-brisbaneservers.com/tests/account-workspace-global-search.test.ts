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

  it('routes panel prefixes and aliases', () => {
    const navigateToPanel = vi.fn();
    const applyResourceSearchQuery = vi.fn();
    const filterProfileCardsByQuery = vi.fn();

    const deps = { navigateToPanel, applyResourceSearchQuery, filterProfileCardsByQuery };

    applyGlobalSearchQuery('panel:voice-lab', deps);
    expect(navigateToPanel).toHaveBeenCalledWith('voice-lab');

    applyGlobalSearchQuery('analytics', deps);
    expect(navigateToPanel).toHaveBeenCalledWith('analytics');
  });

  it('routes resource and profile prefixes', () => {
    const navigateToPanel = vi.fn();
    const applyResourceSearchQuery = vi.fn();
    const filterProfileCardsByQuery = vi.fn();

    applyGlobalSearchQuery('resource:healthcare', {
      navigateToPanel,
      applyResourceSearchQuery,
      filterProfileCardsByQuery,
    });
    expect(applyResourceSearchQuery).toHaveBeenCalledWith('healthcare');

    applyGlobalSearchQuery('profile:brisbane', {
      navigateToPanel,
      applyResourceSearchQuery,
      filterProfileCardsByQuery,
    });
    expect(navigateToPanel).toHaveBeenCalledWith('profiles');
    expect(filterProfileCardsByQuery).toHaveBeenCalledWith('brisbane');
  });

  it('exposes panel aliases used by docs', () => {
    expect(GLOBAL_SEARCH_PANEL_ALIASES.voicelab).toBe('voice-lab');
    expect(GLOBAL_SEARCH_PANEL_ALIASES.billing).toBe('admin-ops');
  });
});
