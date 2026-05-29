import type { APIRoute } from 'astro';
import { isGoogleOAuthEnabled } from '~/lib/oauth/google';

/** GET /api/auth/oauth/status — which OAuth providers are configured */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      success: true,
      google: isGoogleOAuthEnabled()
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
