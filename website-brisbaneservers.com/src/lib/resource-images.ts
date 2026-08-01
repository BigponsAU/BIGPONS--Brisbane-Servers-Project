/**
 * Keep upload visuals in resource markdown (data URLs) when size allows,
 * and re-attach related figures when generating from RAG parents.
 */

import { bytesToDataUrl } from './inference/nvidia-multimodal';

/** Soft cap so corpus JSON stays workable without object storage. */
export const MAX_EMBEDDED_IMAGE_BYTES = 280 * 1024;

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

const IMAGE_MD_RE = /!\[[^\]]*\]\([^)]+\)/g;

export function isImageUpload(fileName: string, mimeType?: string): boolean {
  const mime = (mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const i = fileName.lastIndexOf('.');
  const ext = i >= 0 ? fileName.slice(i + 1).toLowerCase() : '';
  return IMAGE_EXT.has(ext);
}

export function buildEmbeddedImageMarkdown(params: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  alt?: string;
}): { markdown: string; embedded: boolean; warning?: string } {
  if (params.bytes.length === 0) {
    return { markdown: '', embedded: false, warning: 'Empty image file' };
  }
  if (params.bytes.length > MAX_EMBEDDED_IMAGE_BYTES) {
    return {
      markdown: '',
      embedded: false,
      warning: `Image is ${Math.round(params.bytes.length / 1024)}KB — too large to embed (max ${MAX_EMBEDDED_IMAGE_BYTES / 1024}KB). Text was extracted; re-upload a compressed PNG/JPEG to keep the visual.`,
    };
  }
  const mime = params.mimeType || 'image/png';
  if (!mime.startsWith('image/')) {
    return { markdown: '', embedded: false, warning: 'Not an image MIME type' };
  }
  const alt = (params.alt || params.fileName || 'Uploaded visual').replace(/[\[\]]/g, '');
  const dataUrl = bytesToDataUrl(params.bytes, mime);
  return {
    markdown: `![${alt}](${dataUrl})`,
    embedded: true,
  };
}

/** Place the figure near the top of the article (after an optional H1). */
export function prependImageFigure(content: string, imageMarkdown: string): string {
  const figure = imageMarkdown.trim();
  if (!figure) return content;
  if (content.includes(figure) || content.includes('](data:image/')) {
    return content;
  }
  const body = content.trim();
  const h1 = body.match(/^#\s+.+\n*/);
  if (h1) {
    const rest = body.slice(h1[0].length).trimStart();
    return `${h1[0].trimEnd()}\n\n${figure}\n\n${rest}`.trim() + '\n';
  }
  return `${figure}\n\n${body}`.trim() + '\n';
}

export function extractMarkdownImages(content: string): string[] {
  if (!content) return [];
  const matches = content.match(IMAGE_MD_RE) ?? [];
  // Prefer unique figures; keep order.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

export function stripMarkdownImages(content: string): string {
  return content.replace(IMAGE_MD_RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * If generated body has no figures, attach related upload visuals that still
 * belong to the topic (from RAG parent resources).
 */
export function mergeRelatedImages(content: string, relatedImages: string[]): string {
  const existing = extractMarkdownImages(content);
  if (existing.length > 0 || relatedImages.length === 0) {
    return content;
  }
  const unique = relatedImages.filter((img, i, arr) => arr.indexOf(img) === i).slice(0, 4);
  if (unique.length === 0) return content;
  const section = ['## Supporting visuals', '', ...unique.map((img) => `${img}\n`)].join('\n');
  return `${content.trim()}\n\n${section}\n`;
}

export function collectImagesFromResources(
  resources: Array<{ id: string; content?: string }>,
  sourceIds: string[]
): string[] {
  if (!sourceIds.length) return [];
  const idSet = new Set(sourceIds);
  const images: string[] = [];
  for (const r of resources) {
    if (!idSet.has(r.id) || !r.content) continue;
    images.push(...extractMarkdownImages(r.content));
  }
  return images;
}
