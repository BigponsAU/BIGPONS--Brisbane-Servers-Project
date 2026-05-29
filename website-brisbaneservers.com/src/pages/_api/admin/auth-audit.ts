import type { APIRoute } from 'astro';
import { getRecentAuthEvents } from '../../../lib/auth-audit';
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
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '100'), 1), 500);
  const events = await getRecentAuthEvents(limit);

  return new Response(
    JSON.stringify({ success: true, count: events.length, events }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
