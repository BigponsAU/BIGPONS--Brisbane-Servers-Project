import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadResourcesUiState,
  saveResourcesUiState,
  topicExpansionKey,
} from '../src/scripts/portal-resources-ui-state';

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('portal resources UI state', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with no expanded industries so the tree is not forced open', () => {
    expect(loadResourcesUiState().expandedIndustries).toEqual([]);
  });

  it('keeps collapsed industries after a later save of create fields', () => {
    saveResourcesUiState({ expandedIndustries: ['Healthcare'] });
    saveResourcesUiState({ lastIndustry: 'healthcare', lastTopic: 'rosters' });
    const state = loadResourcesUiState();
    expect(state.expandedIndustries).toEqual(['Healthcare']);
    expect(state.lastIndustry).toBe('healthcare');
    expect(state.lastTopic).toBe('rosters');
  });

  it('stores topic expansion against its industry', () => {
    expect(topicExpansionKey('Healthcare', 'Rosters')).toBe('Healthcare::Rosters');
  });
});
