import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { loadPipelineConfig, savePipelineConfig, type PipelineConfig } from '../../../lib/pipeline-config';

/**
 * Apply a pipeline config change (e.g. from analytics suggestion). Admin only.
 * PATCH /api/admin/pipeline-config
 * Body: { autoPublishThreshold?: number, tokenMultiplier?: number }
 */
export const PATCH: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = (await request.json()) as Partial<PipelineConfig>;
    const current = await loadPipelineConfig();
    const next: PipelineConfig = {
      autoPublishThreshold:
        typeof body.autoPublishThreshold === 'number' ? body.autoPublishThreshold : current.autoPublishThreshold,
      tokenMultiplier:
        typeof body.tokenMultiplier === 'number' ? body.tokenMultiplier : current.tokenMultiplier
    };
    await savePipelineConfig(next);
    return new Response(
      JSON.stringify({ config: next, success: true }),
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
