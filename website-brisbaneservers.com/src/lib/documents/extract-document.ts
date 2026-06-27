/**
 * Extract text from uploaded documents (edge-safe). Uses local parsing where possible,
 * NVIDIA NIM vision (Kimi K2.6 etc.) for scanned PDFs and images.
 */
import { isNvidiaConfigured } from '../inference/nvidia-ai-client';
import {
  bytesToDataUrl,
  completeWithNvidiaMultimodal,
  getNvidiaVisionModelId,
} from '../inference/nvidia-multimodal';
import type { DocumentExtractMethod, DocumentExtractResult } from './types';

const MAX_VISION_BYTES = 12 * 1024 * 1024;

function extOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : '';
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Heuristic PDF text pull (text-based PDFs only). */
function extractPdfTextHeuristic(bytes: Uint8Array): string {
  const raw = new TextDecoder('latin1').decode(bytes);
  const literalMatches = raw.match(/\((?:\\.|[^\\)])+?\)/g) ?? [];
  const parts = literalMatches
    .map((m) =>
      m
        .slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
    )
    .filter((t) => t.length > 1 && /[a-zA-Z0-9]/.test(t));
  return parts.join('\n').replace(/\s+\n/g, '\n').trim();
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const { unzipSync } = await import('fflate');
  const files = unzipSync(bytes);
  const docXml = files['word/document.xml'];
  if (!docXml) {
    throw new Error('Invalid DOCX: missing word/document.xml');
  }
  const xml = new TextDecoder('utf-8').decode(docXml);
  const withBreaks = xml
    .replace(/<w:tab[^/]*\/>/g, '\t')
    .replace(/<w:br[^/]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n\n');
  return withBreaks
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

const VISION_EXTRACT_SYSTEM = `You extract document text for a voice-profile rewriting pipeline.
Return markdown that preserves structure: heading levels, numbered/bullet lists, tables (markdown tables), block quotes, and section order.
Do not add commentary. Do not describe the document — output the document content only.
If the file is scanned or image-only, OCR all readable text faithfully.`;

async function extractViaNvidiaVision(
  bytes: Uint8Array,
  mimeType: string,
  fileName: string
): Promise<{ text: string; modelId: string }> {
  if (bytes.length > MAX_VISION_BYTES) {
    throw new Error(`File too large for vision OCR (max ${MAX_VISION_BYTES / (1024 * 1024)}MB)`);
  }
  const dataUrl = bytesToDataUrl(bytes, mimeType);
  const result = await completeWithNvidiaMultimodal({
    system: VISION_EXTRACT_SYSTEM,
    userParts: [
      {
        type: 'text',
        text: `Extract all text from this document (${fileName}). Preserve headings and lists as markdown.`,
      },
      { type: 'image_url', image_url: { url: dataUrl } },
    ],
    maxTokens: 12000,
    temperature: 0.1,
  });
  return { text: result.text, modelId: result.modelId };
}

function mimeForFile(fileName: string, mimeType: string): string {
  if (mimeType) return mimeType;
  const ext = extOf(fileName);
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] ?? 'application/octet-stream';
}

export async function extractDocument(params: {
  fileName: string;
  mimeType?: string;
  bytes: Uint8Array;
}): Promise<DocumentExtractResult> {
  const { fileName, bytes } = params;
  const mime = mimeForFile(fileName, params.mimeType ?? '');
  const ext = extOf(fileName);

  const fail = (warning: string): DocumentExtractResult => ({
    text: '',
    method: 'unsupported',
    processingStatus: 'failed',
    fileName,
    mimeType: mime,
    charCount: 0,
    warning,
  });

  if (bytes.length === 0) {
    return fail('Empty file');
  }

  const textLike = new Set(['txt', 'md', 'markdown', 'csv', 'json']);
  const htmlLike = new Set(['html', 'htm']);

  if (textLike.has(ext) || mime.startsWith('text/')) {
    const text = decodeUtf8(bytes).trim();
    return {
      text,
      method: 'plain_text',
      processingStatus: text.length >= 32 ? 'ready' : 'failed',
      fileName,
      mimeType: mime,
      charCount: text.length,
      warning: text.length < 32 ? 'Extracted text is very short' : undefined,
    };
  }

  if (htmlLike.has(ext) || mime.includes('html')) {
    const text = stripHtml(decodeUtf8(bytes));
    return {
      text,
      method: 'html_strip',
      processingStatus: text.length >= 32 ? 'ready' : 'failed',
      fileName,
      mimeType: mime,
      charCount: text.length,
    };
  }

  if (ext === 'docx' || mime.includes('wordprocessingml')) {
    try {
      const text = await extractDocxText(bytes);
      if (text.length >= 48) {
        return {
          text,
          method: 'docx_xml',
          processingStatus: 'ready',
          fileName,
          mimeType: mime,
          charCount: text.length,
        };
      }
    } catch {
      /* fall through to vision */
    }
    if (!isNvidiaConfigured()) {
      return fail('DOCX extraction failed and NVIDIA vision is not configured');
    }
    const vision = await extractViaNvidiaVision(bytes, mime, fileName);
    return {
      text: vision.text,
      method: 'nvidia_vision',
      processingStatus: vision.text.length >= 32 ? 'ready' : 'failed',
      fileName,
      mimeType: mime,
      charCount: vision.text.length,
      visionModelId: vision.modelId,
    };
  }

  if (ext === 'pdf' || mime === 'application/pdf') {
    const heuristic = extractPdfTextHeuristic(bytes);
    if (heuristic.length >= 80) {
      return {
        text: heuristic,
        method: 'pdf_text',
        processingStatus: 'ready',
        fileName,
        mimeType: mime,
        charCount: heuristic.length,
      };
    }
    if (!isNvidiaConfigured()) {
      return {
        text: heuristic || '[PDF requires NVIDIA vision OCR — set NVIDIA_API_KEY on the edge worker.]',
        method: 'pdf_text',
        processingStatus: 'ocr',
        fileName,
        mimeType: mime,
        charCount: heuristic.length,
        warning: 'Image-only PDF; configure NVIDIA vision for OCR',
      };
    }
    const vision = await extractViaNvidiaVision(bytes, mime, fileName);
    return {
      text: vision.text,
      method: 'nvidia_vision',
      processingStatus: vision.text.length >= 32 ? 'ready' : 'ocr',
      fileName,
      mimeType: mime,
      charCount: vision.text.length,
      visionModelId: vision.modelId,
    };
  }

  const imageExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'tif', 'tiff']);
  if (imageExts.has(ext) || mime.startsWith('image/')) {
    if (!isNvidiaConfigured()) {
      return fail('Image OCR requires NVIDIA_API_KEY on the edge worker');
    }
    const vision = await extractViaNvidiaVision(bytes, mime, fileName);
    return {
      text: vision.text,
      method: 'nvidia_vision',
      processingStatus: 'ready',
      fileName,
      mimeType: mime,
      charCount: vision.text.length,
      visionModelId: vision.modelId,
    };
  }

  return fail(`Unsupported file type: .${ext || 'unknown'}`);
}

export function getConfiguredVisionModelLabel(): string {
  return isNvidiaConfigured() ? getNvidiaVisionModelId() : 'not configured';
}
