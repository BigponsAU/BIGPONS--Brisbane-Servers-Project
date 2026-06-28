import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Resource } from '../src/lib/resource-types';

describe('loadGitCorpusResources', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'git-corpus-'));
    vi.resetModules();
    vi.stubEnv('VOICE_STORAGE_DIR', tempDir);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('reads published resources from resources.json without DATABASE_URL', async () => {
    const sample: Resource[] = [
      {
        id: 'test-resource-1',
        title: 'Test guide',
        description: 'A substantive published resource for static prerender.',
        content: 'word '.repeat(150),
        industry: 'professional-services',
        topic: 'client-management-systems',
        status: 'published',
        visibility: 'public',
        version: 1,
        generatedAt: '2026-06-28T00:00:00.000Z',
      },
    ];
    await writeFile(path.join(tempDir, 'resources.json'), JSON.stringify(sample));

    const { loadGitCorpusResources } = await import('../src/lib/git-corpus');
    const loaded = await loadGitCorpusResources();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toBe('test-resource-1');
  });

  it('returns empty array when corpus file is missing', async () => {
    const { loadGitCorpusResources } = await import('../src/lib/git-corpus');
    const loaded = await loadGitCorpusResources();
    expect(loaded).toEqual([]);
  });
});
