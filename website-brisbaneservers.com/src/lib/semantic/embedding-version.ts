/** Bump when changing default embedding strategy or dimensions. */
export const DEFAULT_EMBEDDING_MODEL =
  (typeof process !== 'undefined' && process.env?.OPENAI_EMBEDDING_MODEL) || 'text-embedding-3-small';
export const DEFAULT_EMBEDDING_VERSION = 1;
export const EMBEDDING_DIM = 256;
