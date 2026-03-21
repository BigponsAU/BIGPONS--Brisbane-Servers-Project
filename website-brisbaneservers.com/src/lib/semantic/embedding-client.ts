import { DEFAULT_EMBEDDING_MODEL, EMBEDDING_DIM } from './embedding-version';

export type EmbeddingProvider = 'openai' | 'hash';

export interface EmbeddingClient {
  embed(texts: string[]): Promise<number[][]>;
  modelId: string;
  provider: EmbeddingProvider;
}

/**
 * OpenAI embeddings API (requires OPENAI_API_KEY).
 */
async function embedOpenAI(texts: string[], model: string): Promise<number[][]> {
  const key = typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined;
  if (!key) {
    throw new Error('OPENAI_API_KEY not set');
  }
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, input: texts })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data.map((d) => d.embedding);
}

/**
 * Deterministic pseudo-embeddings for dev / offline (not semantic-quality; cosine reflects rough lexical overlap).
 */
export function hashEmbedding(text: string, dim: number = EMBEDDING_DIM): number[] {
  const vec = new Array(dim).fill(0);
  const t = text.toLowerCase();
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    vec[i % dim] += (c * (i + 1)) % 997;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function createHashClient(): EmbeddingClient {
  return {
    provider: 'hash',
    modelId: 'hash-fallback-v1',
    async embed(texts: string[]) {
      return texts.map((t) => hashEmbedding(t));
    }
  };
}

function getProvider(): EmbeddingProvider {
  const p =
    (typeof process !== 'undefined' && process.env?.EMBEDDING_PROVIDER) ||
    (import.meta as unknown as { env?: { EMBEDDING_PROVIDER?: string } }).env?.EMBEDDING_PROVIDER;
  if (p === 'openai') return 'openai';
  if (p === 'hash') return 'hash';
  if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) return 'openai';
  return 'hash';
}

export function createEmbeddingClient(): EmbeddingClient {
  const provider = getProvider();
  const model =
    (typeof process !== 'undefined' && process.env?.OPENAI_EMBEDDING_MODEL) || DEFAULT_EMBEDDING_MODEL;
  if (provider === 'openai') {
    return {
      provider: 'openai',
      modelId: model,
      async embed(texts: string[]) {
        return embedOpenAI(texts, model);
      }
    };
  }
  return createHashClient();
}
