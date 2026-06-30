import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GrowthProposal } from '../src/lib/library-growth/types';
import { hashEmbedding } from '../src/lib/semantic/embedding-client';
import { GROWTH_SEMANTIC_DEDUP_THRESHOLD } from '../src/lib/semantic/semantic-similarity';

const mockLoadResources = vi.fn();
const mockLoadIndex = vi.fn();
const mockEmbed = vi.fn();

vi.mock('../src/lib/resources-api', () => ({
  loadResources: () => mockLoadResources(),
  topicsMatch: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
}));

vi.mock('../src/lib/semantic/chunk-index', () => ({
  loadIndex: () => mockLoadIndex(),
}));

vi.mock('../src/lib/semantic/embedding-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/semantic/embedding-client')>();
  return {
    ...actual,
    createEmbeddingClient: () => ({
      provider: 'hash' as const,
      modelId: 'test',
      embed: (texts: string[]) => mockEmbed(texts),
    }),
  };
});

function proposal(overrides: Partial<GrowthProposal> = {}): GrowthProposal {
  return {
    id: 'gp-1',
    kind: 'resource',
    industry: 'healthcare',
    topic: 'appointments',
    title: 'Patient scheduling compliance guide',
    rationale: 'Clinics need clearer booking workflows.',
    status: 'approved',
    source: 'cycle',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('getGrowthMaterializeBlockReason', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadResources.mockResolvedValue([]);
    mockLoadIndex.mockResolvedValue({ chunks: [] });
    mockEmbed.mockImplementation((texts: string[]) => Promise.resolve(texts.map((t) => hashEmbedding(t))));
  });

  it('blocks when published resource covers same topic', async () => {
    const { getGrowthMaterializeBlockReason } = await import('../src/lib/library-growth/dedup');
    mockLoadResources.mockResolvedValue([
      {
        id: 'r1',
        industry: 'healthcare',
        topic: 'appointments',
        title: 'Existing guide',
        status: 'published',
        isStarterBlock: false,
      },
    ]);
    const reason = await getGrowthMaterializeBlockReason(proposal());
    expect(reason).toMatch(/published resource already covers/i);
  });

  it('blocks semantically similar published content in same industry', async () => {
    const { getGrowthMaterializeBlockReason } = await import('../src/lib/library-growth/dedup');
    const dupText = 'Patient scheduling compliance guide appointments clinics booking workflows';
    const vec = hashEmbedding(dupText);
    mockLoadResources.mockResolvedValue([
      {
        id: 'r-published',
        industry: 'healthcare',
        topic: 'other-topic',
        title: 'Scheduling handbook',
        status: 'published',
        isStarterBlock: false,
      },
    ]);
    mockLoadIndex.mockResolvedValue({
      chunks: [
        {
          id: 'ch-1',
          resourceId: 'r-published',
          chunkIndex: 0,
          text: dupText,
          vector: vec,
          embeddingModel: 'test',
          embeddingVersion: 1,
        },
      ],
    });
    mockEmbed.mockResolvedValue([vec]);

    const reason = await getGrowthMaterializeBlockReason(
      proposal({
        title: 'Patient scheduling compliance guide',
        rationale: 'appointments clinics booking workflows',
      })
    );
    expect(reason).toMatch(/Semantically similar/i);
    expect(mockEmbed).toHaveBeenCalled();
  });

  it('does not block when similarity is below threshold', async () => {
    const { getGrowthMaterializeBlockReason } = await import('../src/lib/library-growth/dedup');
    const proposalVec = hashEmbedding('unique retail pos topic');
    mockLoadResources.mockResolvedValue([
      {
        id: 'r-retail',
        industry: 'retail',
        topic: 'inventory',
        title: 'POS systems',
        status: 'published',
        isStarterBlock: false,
      },
    ]);
    mockLoadIndex.mockResolvedValue({
      chunks: [
        {
          id: 'ch-retail',
          resourceId: 'r-retail',
          chunkIndex: 0,
          text: 'retail inventory pos',
          vector: hashEmbedding('retail inventory pos integration'),
          embeddingModel: 'test',
          embeddingVersion: 1,
        },
      ],
    });
    mockEmbed.mockResolvedValue([proposalVec]);

    const reason = await getGrowthMaterializeBlockReason(
      proposal({ industry: 'healthcare', topic: 'appointments', title: 'Unique healthcare topic' })
    );
    expect(reason).toBeNull();
    expect(cosineSafe(proposalVec, hashEmbedding('retail inventory pos integration'))).toBeLessThan(
      GROWTH_SEMANTIC_DEDUP_THRESHOLD
    );
  });
});

function cosineSafe(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}
