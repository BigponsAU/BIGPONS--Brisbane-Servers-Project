import type { APIRoute } from 'astro';
import { startGoogleOAuth } from '~/lib/oauth/google';

/** GET /api/auth/oauth/google/start — redirect to Google OAuth consent */
export const GET: APIRoute = async ({ request }) => startGoogleOAuth(request);
