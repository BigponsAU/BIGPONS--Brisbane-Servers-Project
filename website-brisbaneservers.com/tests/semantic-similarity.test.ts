import { describe, expect, it } from 'vitest';
import { cosineSimilarity, GROWTH_SEMANTIC_DEDUP_THRESHOLD } from '../src/lib/semantic/semantic-similarity';
import { hashEmbedding } from '../src/lib/semantic/embedding-client';

describe('semantic-similarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = hashEmbedding('patient scheduling compliance');
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('returns lower score for unrelated text hashes', () => {
    const a = hashEmbedding('patient scheduling compliance healthcare');
    const b = hashEmbedding('retail inventory pos integration');
    expect(cosineSimilarity(a, b)).toBeLessThan(GROWTH_SEMANTIC_DEDUP_THRESHOLD);
  });

  it('returns high score for near-duplicate lexical hashes', () => {
    const a = hashEmbedding('patient scheduling compliance guide');
    const b = hashEmbedding('patient scheduling compliance handbook');
    expect(cosineSimilarity(a, b)).toBeGreaterThanOrEqual(0.7);
  });
});
