import type { APIRoute } from 'astro';
import { requireEditor } from '../../../utils/auth';
import { previewDocumentTokenBalance } from '../../../lib/documents/document-token-guard';

/**
 * Token costs and balance for document OCR / rewrite tools.
 * GET /api/documents/costs
 */
export const GET: APIRoute = async ({ request }) => {
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

  const preview = await previewDocumentTokenBalance(authResult.user.id, authResult.user.role);
  return new Response(
    JSON.stringify({ success: true, ...preview }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
