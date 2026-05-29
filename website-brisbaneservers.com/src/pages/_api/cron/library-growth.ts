import type { APIRoute } from 'astro';
import { runDueLibraryGrowthCycle } from '~/lib/library-growth/run-cycle';

/**
 * Secured cron endpoint for hosted API (Render cron, GitHub Actions, Uptime Robot).
 * POST /api/cron/library-growth
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export const POST: APIRoute = async ({ request }) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return new Response(
      JSON.stringify({ success: false, error: 'CRON_SECRET is not configured on the API host' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token !== secret) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await runDueLibraryGrowthCycle();
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cron run failed';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
