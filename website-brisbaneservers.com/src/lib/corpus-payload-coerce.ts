/**
 * Normalize corpus JSONB payloads — legacy rows stored a JSON string inside jsonb.
 */

export function unwrapCorpusJsonPayload<T>(value: T): T {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

/** @alias unwrapCorpusJsonPayload */
export const coerceCorpusPayload = unwrapCorpusJsonPayload;

/** @alias unwrapCorpusJsonPayload — use before persisting to jsonb */
export const normalizeForJsonbStorage = unwrapCorpusJsonPayload;

export function isStringEncodedCorpusPayload(value: unknown): boolean {
  return typeof value === 'string';
}

export function asCorpusArray<T>(value: unknown, fallback: T[] = []): T[] {
  const unwrapped = unwrapCorpusJsonPayload(value);
  return Array.isArray(unwrapped) ? (unwrapped as T[]) : fallback;
}

export function asCorpusObject<T extends object>(value: unknown, fallback: T): T {
  const unwrapped = unwrapCorpusJsonPayload(value);
  if (unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
    return unwrapped as T;
  }
  return fallback;
}

export type CorpusPayloadKind = 'array' | 'object' | 'string-encoded' | 'other' | 'null';

export function corpusPayloadKind(value: unknown): CorpusPayloadKind {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return 'string-encoded';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'other';
}
