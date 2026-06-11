import type { APIRoute } from 'astro';

/**
 * Lightweight wake endpoint for auth flows (Render origin).
 * Edge worker overrides with background Render warm — same path for client uniformity.
 * GET /api/auth/wake
 */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      success: true,
      status: 'ok',
      edge: 'render',
      message: 'API is warm.',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
