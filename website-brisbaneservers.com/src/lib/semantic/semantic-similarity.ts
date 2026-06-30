/** Cosine similarity between two embedding vectors (0–1 when normalized). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
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

/** Block materialize when proposal embedding matches indexed corpus above this score. */
export const GROWTH_SEMANTIC_DEDUP_THRESHOLD = 0.86;

/** Minimum cosine for semantic-route edges on the voice map. */
export const SEMANTIC_ROUTE_MIN_EDGE = 0.72;

/** Nearest neighbors per node when building semantic route topology. */
export const SEMANTIC_ROUTE_K = 3;
