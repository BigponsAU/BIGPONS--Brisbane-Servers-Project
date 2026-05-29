import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../utils/auth';
import { loadResources, saveResources } from '../../../lib/resources-api';
import { runIndexPipeline } from '../../../lib/semantic/pipeline';
import { checkRateLimit, getClientKey } from '../../../lib/rate-limit';

const MAX_REQ_PER_MIN = 20;

/**
 * Re-run chunk/embed index for one resource. POST JSON: { resourceId: string }
 */
export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const key = `reindex:${getClientKey(request)}`;
  const rl = checkRateLimit(key, MAX_REQ_PER_MIN, 60_000);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT', success: false }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) }
      }
    );
  }

  try {
    const body = await request.json();
    const resourceId = typeof body.resourceId === 'string' ? body.resourceId : '';
    if (!resourceId) {
      return new Response(
        JSON.stringify({ error: 'resourceId required', code: 'MISSING_FIELDS', success: false }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resources = await loadResources();
    const idx = resources.findIndex((r) => r.id === resourceId);
    if (idx < 0) {
      return new Response(
        JSON.stringify({ error: 'Not found', code: 'NOT_FOUND', success: false }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updated = await runIndexPipeline(resources[idx]);
    resources[idx] = updated;
    await saveResources(resources);

    return new Response(
      JSON.stringify({ success: true, resource: updated }),
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
