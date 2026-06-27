import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { checkRateLimit, getClientKey } from '../../../lib/rate-limit';
import { extractDocument } from '../../../lib/documents/extract-document';
import {
  ensureExtractTokenBalance,
  spendDocumentTokens,
  tokenCostForExtractMethod,
} from '../../../lib/documents/document-token-guard';

const MAX_REQ_PER_MIN = 20;
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Extract text from PDF, DOCX, images, or plain files via local parse + NVIDIA vision OCR.
 * POST /api/documents/extract (multipart: file)
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireEditor(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      {
        status: authResult.code === 'FORBIDDEN' ? 403 : 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const rl = checkRateLimit(`doc-extract:${getClientKey(request)}`, MAX_REQ_PER_MIN, 60_000);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT', success: false }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded', code: 'NO_FILE', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (file.size > MAX_BYTES) {
      return new Response(
        JSON.stringify({
          error: `File exceeds ${MAX_BYTES / (1024 * 1024)}MB limit`,
          code: 'FILE_TOO_LARGE',
          success: false,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const preflight = await ensureExtractTokenBalance({
      userId: authResult.user.id,
      role: authResult.user.role,
      fileName: file.name,
      mimeType: file.type,
    });
    if (!preflight.ok) {
      return new Response(
        JSON.stringify({
          error: preflight.error,
          code: preflight.code,
          success: false,
          tokens: { required: preflight.cost, balance: preflight.balance },
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const extracted = await extractDocument({
      fileName: file.name,
      mimeType: file.type,
      bytes,
    });

    if (extracted.processingStatus === 'failed') {
      return new Response(
        JSON.stringify({
          success: false,
          error: extracted.warning || 'Extraction failed',
          code: 'EXTRACTION_FAILED',
          extraction: extracted,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokenCost = tokenCostForExtractMethod(extracted.method);
    const tokenSpend = await spendDocumentTokens({
      userId: authResult.user.id,
      role: authResult.user.role,
      cost: tokenCost,
      reason: 'document_extract',
    });
    if (!tokenSpend.ok) {
      return new Response(
        JSON.stringify({
          error: tokenSpend.error,
          code: tokenSpend.code,
          success: false,
          tokens: { required: tokenSpend.cost, balance: tokenSpend.balance },
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        extraction: extracted,
        tokens: {
          spent: tokenSpend.waived ? 0 : tokenSpend.cost,
          balance: tokenSpend.balance,
          waived: tokenSpend.waived,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, code: 'INTERNAL_ERROR', success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
