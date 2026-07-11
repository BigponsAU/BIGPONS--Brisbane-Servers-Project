import type { APIRoute } from 'astro';
import { getAuthEventsTotal, getRecentAuthEvents } from '../../../lib/auth-audit';
import { requireAdmin } from '../../../utils/auth';

export const GET: APIRoute = async ({ request }) => {
  const authResult = await requireAdmin(request);
  if ('error' in authResult) {
    return new Response(
      JSON.stringify({ error: authResult.error, code: authResult.code, success: false }),
      { status: authResult.code === 'FORBIDDEN' ? 403 : 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '25'), 1), 100);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? '0'), 0);
  const [events, total] = await Promise.all([getRecentAuthEvents(limit, offset), getAuthEventsTotal()]);

  return new Response(
    JSON.stringify({
      success: true,
      count: events.length,
      total,
      limit,
      offset,
      hasMore: offset + events.length < total,
      events,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
