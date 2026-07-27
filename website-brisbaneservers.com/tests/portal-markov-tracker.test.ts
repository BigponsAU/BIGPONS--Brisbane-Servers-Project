import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildMarkovExtrapolationPrompt,
  debugFromPortalMarkov,
  getPortalMarkovAnalysisReport,
  getPortalMarkovSummary,
  ingestResourcesIntoMarkov,
  resetPortalMarkovTracker,
  trackResourceCreation,
} from '../src/scripts/portal-markov-tracker';

const STORAGE_KEY = 'bs-resource-markov-v1';

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

describe('portal-markov-tracker (resource lineage)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
  });

  afterEach(() => {
    resetPortalMarkovTracker();
    vi.unstubAllGlobals();
  });

  it('tracks resource creation hops with voice match', () => {
    trackResourceCreation({
      fromResourceId: 'starter-a',
      fromLabel: 'Starter A',
      toResourceId: 'draft-b',
      toLabel: 'Draft B',
      sourceKind: 'starter',
      voiceProfileId: 'brisbane',
      voiceScore: 0.82,
    });
    trackResourceCreation({
      fromResourceId: 'draft-b',
      toResourceId: 'draft-c',
      sourceKind: 'rag',
      voiceProfileId: 'brisbane',
      voiceScore: 0.74,
    });
    trackResourceCreation({
      fromResourceId: 'starter-a',
      toResourceId: 'draft-d',
      sourceKind: 'generate',
      voiceProfileId: 'alt-voice',
      voiceScore: 0.61,
    });

    const summary = getPortalMarkovSummary();
    expect(summary).toContain('Lineage hops: 3');
    expect(summary).toContain('brisbane');
    expect(summary).toContain('alt-voice');
    expect(summary).toContain('starter-a');
    expect(summary).toContain('draft-b');

    const report = getPortalMarkovAnalysisReport();
    expect(report.summary.lineageHops).toBe(3);
    expect(report.voiceShares[0]?.voiceProfileId).toBe('brisbane');
    expect(report.voiceShares[0]?.hops).toBe(2);
    expect(Number(report.summary.dominantVoiceSharePercent)).toBeGreaterThan(50);
  });

  it('ingests lineage from resource metadata', () => {
    ingestResourcesIntoMarkov([
      {
        id: 'child-1',
        title: 'Child',
        metadata: {
          sourceResourceId: 'parent-1',
          sourceKind: 'starter',
          voiceProfileId: 'brisbane',
          voiceScore: 0.9,
        },
      },
      {
        id: 'parent-1',
        title: 'Parent',
        isStarterBlock: true,
        metadata: { voiceScore: 0.95 },
      },
    ]);

    const debug = debugFromPortalMarkov();
    expect(debug).toContain('parent-1');
    expect(debug).toContain('child-1');
    expect(debug).toContain('90%');
  });

  it('builds extrapolation prompt from lineage + voice share', () => {
    trackResourceCreation({
      fromResourceId: 'a',
      toResourceId: 'b',
      sourceKind: 'rag',
      voiceProfileId: 'brisbane',
      voiceScore: 0.7,
    });
    const prompt = buildMarkovExtrapolationPrompt();
    expect(prompt).toContain('resource lineage');
    expect(prompt).toContain('brisbane');
    expect(prompt).toContain('Voice share');
  });

  it('renders HTML summary with share bars', async () => {
    trackResourceCreation({
      fromResourceId: 'a',
      toResourceId: 'b',
      sourceKind: 'rag',
      voiceProfileId: 'brisbane',
      voiceScore: 0.8,
    });
    const { renderPortalMarkovSummaryHtml } = await import('../src/scripts/portal-markov-tracker');
    const html = renderPortalMarkovSummaryHtml();
    expect(html).toContain('markov-dashboard');
    expect(html).toContain('brisbane');
    expect(html).toContain('markov-share-row__fill');
  });

  it('reset clears stored state', () => {
    trackResourceCreation({
      fromResourceId: 'a',
      toResourceId: 'b',
      sourceKind: 'generate',
      voiceScore: 0.5,
    });
    resetPortalMarkovTracker();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getPortalMarkovSummary()).toContain('Lineage hops: 0');
  });
});
