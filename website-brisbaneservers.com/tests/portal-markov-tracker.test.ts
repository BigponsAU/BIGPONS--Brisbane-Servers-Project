import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildMarkovExtrapolationPrompt,
  debugFromPortalMarkov,
  getPortalMarkovAnalysisReport,
  getPortalMarkovSummary,
  registerPortalFunction,
  resetPortalMarkovTracker,
  trackPortalAction,
  trackPortalError,
  trackPortalPanel,
} from '../src/scripts/portal-markov-tracker';

const STORAGE_KEY = 'bs-portal-markov-v2';

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
      return store.get(key) ?? null;
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

describe('portal-markov-tracker', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
  });

  afterEach(() => {
    resetPortalMarkovTracker();
    vi.unstubAllGlobals();
  });

  it('tracks panel transitions', () => {
    trackPortalPanel('dashboard');
    trackPortalPanel('resources');
    trackPortalPanel('profiles');
    const summary = getPortalMarkovSummary();
    expect(summary).toContain('dashboard → resources');
    expect(summary).toContain('resources → profiles');
    expect(summary).toContain('Current panel: profiles');
  });

  it('tracks actions and errors for debug report', () => {
    registerPortalFunction('loadResources');
    registerPortalFunction('saveResource');
    trackPortalAction('loadResources');
    trackPortalAction('saveResource');
    trackPortalError('saveResource', new Error('network failed'));

    const report = getPortalMarkovAnalysisReport();
    expect(report.summary.totalCalls).toBe(2);
    expect(report.summary.totalErrors).toBe(1);
    expect(report.functionsWithErrors[0]?.name).toBe('saveResource');

    const debug = debugFromPortalMarkov();
    expect(debug).toContain('saveResource');
    expect(debug).toContain('network failed');
    expect(debug).toContain('Error-prone transitions');
  });

  it('builds extrapolation prompt from chain data', () => {
    registerPortalFunction('loadResources');
    trackPortalAction('loadResources');
    trackPortalError('loadResources', new Error('timeout'));
    const prompt = buildMarkovExtrapolationPrompt();
    expect(prompt).toContain('Markov Chain Analysis');
    expect(prompt).toContain('loadResources');
  });

  it('reset clears stored state', () => {
    trackPortalPanel('voice-lab');
    resetPortalMarkovTracker();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getPortalMarkovSummary()).toContain('Steps recorded: 1');
  });
});
