import type { Resource } from '../resource-types';

export interface TextChunk {
  /** Deterministic: `${resourceId}::${chunkIndex}` */
  id: string;
  resourceId: string;
  chunkIndex: number;
  text: string;
}

const DEFAULT_MAX_CHARS = 1200;
const DEFAULT_OVERLAP = 200;

/**
 * Deterministic character-based chunking with overlap.
 */
export function chunkText(
  resourceId: string,
  body: string,
  maxChars: number = DEFAULT_MAX_CHARS,
  overlap: number = DEFAULT_OVERLAP
): TextChunk[] {
  const text = body.replace(/\r\n/g, '\n').trim();
  if (!text) {
    return [];
  }
  const chunks: TextChunk[] = [];
  let start = 0;
  let idx = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    const slice = text.slice(start, end).trim();
    if (slice.length > 0) {
      chunks.push({
        id: `${resourceId}::${idx}`,
        resourceId,
        chunkIndex: idx,
        text: slice
      });
      idx += 1;
    }
    if (end >= text.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export function chunkResource(resource: Resource, maxChars?: number, overlap?: number): TextChunk[] {
  return chunkText(resource.id, resource.content, maxChars, overlap);
}
